// signpost: `stree view --json` for a project's folder, decoded (fork, see FORK.md). It never reads the session-tree log
// itself: in a worktree `.git` is a file, and only stree finds git's common dir.
import {
  StreeViewData,
  StreeViewError,
  type StreeMissing,
  type StreeViewInput,
  type StreeViewResult,
} from "@t3tools/contracts";
import { isCommandMissingCause } from "@t3tools/provider-core/server/snapshotProbe";
import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";

import * as ProcessRunner from "../processRunner.ts";
import * as ProjectService from "../project/ProjectService.ts";
import { BridgeLauncher } from "./BridgeLauncher.ts";
import { streeCommand } from "./streeCommand.ts";

const NO_TREE: StreeViewData = { tree: false };
const MISSING: StreeMissing = { stree: "missing" };

// Many clients poll the same project every few seconds; one process answers them all.
const CACHE_TTL = "2 seconds";
// A tree opened while T3 runs gets its bridge even when no client looks at that project.
const SWEEP_EVERY = "30 seconds";

const decodeView = Schema.decodeUnknownEffect(Schema.fromJsonString(StreeViewData));
const decodeFailure = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ ok: Schema.Literal(false), error: Schema.String })),
);

export class StreeView extends Context.Service<
  StreeView,
  {
    /** What `stree view` says for the folder, and when it has a tree, how its bridge is; or that stree is missing. */
    readonly view: (input: StreeViewInput) => Effect.Effect<StreeViewResult, StreeViewError>;
  }
>()("t3/signpost/StreeView") {}

export const make = Effect.gen(function* () {
  const runner = yield* ProcessRunner.ProcessRunner;
  const launcher = yield* BridgeLauncher;
  const projects = yield* ProjectService.ProjectService;

  const read = Effect.fn("StreeView.read")(function* (cwd: string) {
    const [command, ...base] = streeCommand();
    const out = yield* runner
      .run({
        command,
        args: [...base, "view", "--json"],
        cwd,
        timeout: "10 seconds",
        maxOutputBytes: 1024 * 1024,
      })
      .pipe(
        // stree is not on the PATH T3 sees: say so, it is not "no tree" (the packaged app has only the login PATH).
        Effect.catchTags({
          ProcessSpawnError: (error) =>
            isCommandMissingCause(error.cause) ? Effect.succeed(null) : Effect.fail(error),
        }),
        Effect.mapError((cause) => new StreeViewError({ cwd, detail: cause.message, cause })),
      );
    if (out === null) return MISSING;
    if (out.code !== 0) {
      // Not in a git repo, or no log: no tree.
      const failure = decodeFailure(out.stdout.trim());
      if (failure._tag === "Some" && failure.value.error === "no-log") return NO_TREE;
      const detail = out.stderr.trim() || out.stdout.trim() || `exit ${out.code}`;
      return yield* new StreeViewError({ cwd, detail });
    }
    return yield* decodeView(out.stdout.trim()).pipe(
      Effect.mapError((cause) => new StreeViewError({ cwd, detail: cause.message, cause })),
    );
  });

  const cache = yield* Cache.make({ capacity: 256, timeToLive: CACHE_TTL, lookup: read });

  const view = Effect.fn("StreeView.view")(function* (input: StreeViewInput) {
    const data = yield* Cache.get(cache, input.cwd);
    if ("stree" in data) return data;
    // A tree here: make sure its repo's bridge runs, so a tree opened while T3 runs is picked up.
    const state = data.tree ? yield* launcher.ensure(input.cwd) : null;
    return state === null ? { view: data } : { view: data, launcher: state };
  });

  const sweep = projects.listShells().pipe(
    Effect.flatMap((shells) =>
      Effect.forEach(shells, (shell) => Effect.ignore(view({ cwd: shell.workspaceRoot })), {
        discard: true,
      }),
    ),
    Effect.catch((cause) => Effect.logWarning("signpost: could not list projects", { cause })),
  );
  yield* sweep.pipe(Effect.repeat(Schedule.spaced(SWEEP_EVERY)), Effect.forkScoped);

  return StreeView.of({ view });
});

/** Server-lifetime, so the sweep runs and the cache is shared by every connection. */
export const layer = Layer.effect(StreeView, make).pipe(Layer.provide(ProcessRunner.layer));
