// signpost: T3 starts session-tree's bridge by itself, so the person has nothing to remember (fork, see FORK.md). One
// `stree bridge` child per repo, keyed by git's common dir, so copies of one repo open as several projects share it.
// A bridge that falls starts again after a growing wait (bridgeRestart.logic.ts); one with no token waits for the token
// file to change. Children live in the layer's scope and die with the server. The token is never read here: only
// whether its file exists, its time and size.
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import type { BridgeLauncherState } from "@t3tools/contracts";

import * as ProcessRunner from "../processRunner.ts";
import { afterExit, tokenChanged, type TokenStamp } from "./bridgeRestart.logic.ts";
import { streeCommand } from "./streeCommand.ts";

interface Bridge {
  state: BridgeLauncherState;
  tokenPath: string | null;
  tokenAtExit: TokenStamp;
}

export class BridgeLauncher extends Context.Service<
  BridgeLauncher,
  {
    /**
     * Called when `stree view` in `cwd` said there is a tree: starts the repo's bridge if it is not there, or tries
     * once more after no-token when the token file changed. null when `cwd` is not in a git repo.
     */
    readonly ensure: (cwd: string) => Effect.Effect<BridgeLauncherState | null>;
  }
>()("t3/signpost/BridgeLauncher") {}

const MAX_STDOUT = 64 * 1024;

export const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const runner = yield* ProcessRunner.ProcessRunner;
  const lifetime = yield* Effect.scope;
  const bridges = new Map<string, Bridge>();
  const commonDirs = new Map<string, string>();

  /** Whether the token file exists, its time and size. Never its content. */
  const stampOf = (file: string | null): Effect.Effect<TokenStamp> =>
    file === null
      ? Effect.succeed(null)
      : fileSystem.stat(file).pipe(
          Effect.map((info) => ({
            mtimeMs: Option.match(info.mtime, { onNone: () => 0, onSome: (d) => d.getTime() }),
            size: Number(info.size),
          })),
          Effect.orElseSucceed(() => null),
        );

  const commonDirOf = Effect.fn("BridgeLauncher.commonDirOf")(function* (cwd: string) {
    const known = commonDirs.get(cwd);
    if (known !== undefined) return known;
    const out = yield* runner
      .run({
        command: "git",
        args: ["-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"],
        timeout: "10 seconds",
      })
      .pipe(Effect.orElseSucceed(() => null));
    if (out === null || out.code !== 0) return null;
    const raw = out.stdout.trim();
    const dir = yield* fileSystem
      .realPath(path.isAbsolute(raw) ? raw : path.resolve(cwd, raw))
      .pipe(Effect.orElseSucceed(() => null));
    if (dir !== null) commonDirs.set(cwd, dir);
    return dir;
  });

  /** One run of `stree bridge --json`: its exit code (null if it did not start) and its stdout, the --json error. */
  const runOnce = Effect.fn("BridgeLauncher.runOnce")(
    function* (cwd: string) {
      const [command, ...base] = streeCommand();
      const child = yield* spawner.spawn(
        ChildProcess.make(command, [...base, "bridge", "--json"], {
          cwd,
          env: process.env,
          shell: false,
          detached: false,
          stdin: "ignore",
          stdout: "pipe",
          // The bridge writes its own bridge.log next to the session-tree log.
          stderr: "ignore",
          forceKillAfter: "3 seconds",
        }),
      );
      const stdout = yield* child.stdout.pipe(
        Stream.decodeText(),
        Stream.runFold(
          () => "",
          (acc: string, chunk: string) =>
            acc.length >= MAX_STDOUT ? acc : (acc + chunk).slice(0, MAX_STDOUT),
        ),
        Effect.orElseSucceed(() => ""),
        Effect.forkScoped,
      );
      const code = yield* child.exitCode;
      return { code: Number(code), stdout: yield* Fiber.join(stdout) };
    },
    Effect.scoped,
    (effect, cwd) =>
      Effect.catch(effect, (cause) =>
        Effect.logWarning("signpost: could not start stree bridge", { cwd, cause }).pipe(
          Effect.as({ code: null, stdout: "" }),
        ),
      ),
  );

  const supervise = Effect.fn("BridgeLauncher.supervise")(function* (
    commonDir: string,
    cwd: string,
    bridge: Bridge,
  ) {
    let previousDelayMs = 0;
    for (;;) {
      bridge.state = "running";
      const startedAt = yield* Clock.currentTimeMillis;
      yield* Effect.logInfo("signpost: stree bridge started", { commonDir, cwd });
      const exit = yield* runOnce(cwd);
      const uptimeMs = (yield* Clock.currentTimeMillis) - startedAt;
      const decision = afterExit({ ...exit, uptimeMs, previousDelayMs });
      if (decision.kind === "wait-for-token") {
        bridge.state = "no-token";
        bridge.tokenPath = decision.tokenPath;
        bridge.tokenAtExit = yield* stampOf(decision.tokenPath);
        yield* Effect.logInfo(
          "signpost: stree bridge has no token; waiting for the file to change",
          {
            commonDir,
          },
        );
        return;
      }
      bridge.state = "restarting";
      previousDelayMs = decision.delayMs;
      yield* Effect.logWarning("signpost: stree bridge exited; starting it again", {
        commonDir,
        code: exit.code,
        uptimeMs,
        delayMs: decision.delayMs,
      });
      yield* Effect.sleep(decision.delayMs);
    }
  });

  const ensure = Effect.fn("BridgeLauncher.ensure")(function* (cwd: string) {
    const commonDir = yield* commonDirOf(cwd);
    if (commonDir === null) return null;
    const waiting = bridges.get(commonDir);
    const tokenNow = waiting?.state === "no-token" ? yield* stampOf(waiting.tokenPath) : null;
    // Decide and mark in one synchronous step, so two queries at once never start two bridges.
    const start = yield* Effect.sync(() => {
      const known = bridges.get(commonDir);
      if (known === undefined) {
        const bridge: Bridge = { state: "running", tokenPath: null, tokenAtExit: null };
        bridges.set(commonDir, bridge);
        return bridge;
      }
      if (known.state === "no-token" && tokenChanged(known.tokenAtExit, tokenNow)) {
        known.state = "running";
        return known;
      }
      return null;
    });
    if (start !== null) yield* Effect.forkIn(supervise(commonDir, cwd, start), lifetime);
    return bridges.get(commonDir)?.state ?? null;
  });

  return BridgeLauncher.of({ ensure });
});

/** Server-lifetime: closing the layer's scope interrupts the supervisors, and each child is killed with its scope. */
export const layer = Layer.effect(BridgeLauncher, make).pipe(Layer.provide(ProcessRunner.layer));
