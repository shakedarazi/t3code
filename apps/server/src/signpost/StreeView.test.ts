import { describe, expect, it } from "@effect/vitest";
import { isStreeMissing, ProjectId, type OrchestrationProjectShell } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PlatformError from "effect/PlatformError";
import * as Queue from "effect/Queue";
import * as TestClock from "effect/testing/TestClock";

import * as ProcessRunner from "../processRunner.ts";
import * as ProjectService from "../project/ProjectService.ts";
import { BridgeLauncher } from "./BridgeLauncher.ts";
import * as StreeView from "./StreeView.ts";

const TREE = {
  ok: true,
  tree: true,
  bridge: { bound: true },
  signpost: {
    why: "your-turn",
    node: "trunk",
    thread: "thr-trunk",
    next: { rule: 3, action: "stay", target: "trunk", reason: "your turn" },
  },
  map: {
    cursor: { node: "trunk", thread: "thr-trunk" },
    nodes: [
      {
        id: "trunk",
        parent: null,
        depth: 0,
        mode: "sync",
        state: "active",
        turn: "you",
        subtrunk: false,
        waiting: null,
        target: true,
        goal: null,
        thread: "thr-trunk",
      },
    ],
  },
};

type Printed = { readonly code: number; readonly stdout: string } | "not-found" | "spawn-failed";

const output = (code: number, stdout: string): ProcessRunner.ProcessRunOutput => ({
  stdout,
  stderr: "",
  code: code as ProcessRunner.ProcessRunOutput["code"],
  timedOut: false,
  stdoutTruncated: false,
  stderrTruncated: false,
  stdoutInvalidUtf8: false,
  stderrInvalidUtf8: false,
});

const spawnError = (reason: "NotFound" | "PermissionDenied") =>
  new ProcessRunner.ProcessSpawnError({
    command: "stree",
    argumentCount: 2,
    cause: PlatformError.systemError({ _tag: reason, module: "ChildProcess", method: "spawn" }),
  });

const shell = (workspaceRoot: string): OrchestrationProjectShell => ({
  id: ProjectId.make(workspaceRoot),
  title: workspaceRoot,
  workspaceRoot,
  defaultModelSelection: null,
  scripts: [],
  createdAt: "2026-10-21T00:00:00.000Z",
  updatedAt: "2026-10-21T00:00:00.000Z",
});

/** A StreeView over fake `stree` runs (by folder), a fake launcher, and the projects T3 has open. */
const setup = Effect.fn(function* (input: {
  readonly printed: (cwd: string) => Printed;
  readonly projects?: OrchestrationProjectShell[];
}) {
  const runs: string[] = [];
  const ensured = yield* Queue.unbounded<string>();
  const projects = input.projects ?? [];
  const layer = Layer.effect(StreeView.StreeView, StreeView.make).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(ProcessRunner.ProcessRunner, {
          run: (run) =>
            Effect.suspend(() => {
              const cwd = run.cwd ?? "";
              runs.push(cwd);
              const printed = input.printed(cwd);
              if (printed === "not-found") return Effect.fail(spawnError("NotFound"));
              if (printed === "spawn-failed") return Effect.fail(spawnError("PermissionDenied"));
              return Effect.succeed(output(printed.code, printed.stdout));
            }),
        }),
        Layer.succeed(BridgeLauncher, {
          ensure: (cwd) => Queue.offer(ensured, cwd).pipe(Effect.as("running" as const)),
        }),
        Layer.mock(ProjectService.ProjectService)({
          listShells: () => Effect.sync(() => [...projects]),
        }),
      ),
    ),
  );
  const context = yield* Layer.build(layer);
  const service = yield* Effect.service(StreeView.StreeView).pipe(Effect.provide(context));
  return { service, runs, ensured, projects };
});

const tree = { code: 0, stdout: `${JSON.stringify(TREE)}\n` };
const noTree = { code: 0, stdout: '{"ok":true,"tree":false}\n' };
const noLog = {
  code: 2,
  stdout: '{"ok":false,"error":"no-log","message":"not inside a git repo"}\n',
};

describe("StreeView.view", () => {
  it.effect("a tree: the view, typed, and the repo's bridge made sure of", () =>
    Effect.gen(function* () {
      const { service, ensured } = yield* setup({ printed: () => tree });
      const result = yield* service.view({ cwd: "/repo" });
      if (isStreeMissing(result)) return expect.unreachable("stree ran");
      expect(result.launcher).toBe("running");
      expect(result.view.tree && result.view.signpost).toEqual({
        why: "your-turn",
        node: "trunk",
        thread: "thr-trunk",
      });
      expect(yield* Queue.take(ensured)).toBe("/repo");
    }).pipe(Effect.scoped),
  );

  it.effect("no tree, no log or not a git repo: no tree, and no bridge", () =>
    Effect.gen(function* () {
      const printed: Record<string, Printed> = { "/plain": noTree, "/no-log": noLog };
      const { service, ensured } = yield* setup({ printed: (cwd) => printed[cwd] ?? tree });
      for (const cwd of Object.keys(printed))
        expect(yield* service.view({ cwd })).toEqual({ view: { tree: false } });
      expect(yield* Queue.size(ensured)).toBe(0);
    }).pipe(Effect.scoped),
  );

  it.effect("stree not on the PATH T3 sees: not installed, not no tree; no bridge started", () =>
    Effect.gen(function* () {
      const { service, ensured } = yield* setup({ printed: () => "not-found" });
      expect(yield* service.view({ cwd: "/repo" })).toEqual({ stree: "missing" });
      expect(yield* Queue.size(ensured)).toBe(0);
    }).pipe(Effect.scoped),
  );

  it.effect("any other failure is an error, not a missing tree", () =>
    Effect.gen(function* () {
      const printed: Record<string, Printed> = {
        "/crash": { code: 1, stdout: "" },
        "/garbled": { code: 0, stdout: "not json" },
        "/denied": "spawn-failed",
      };
      const { service } = yield* setup({ printed: (cwd) => printed[cwd] ?? tree });
      for (const cwd of Object.keys(printed)) {
        const error = yield* Effect.flip(service.view({ cwd }));
        expect(error._tag).toBe("StreeViewError");
      }
    }).pipe(Effect.scoped),
  );

  it.effect("many polls of one folder within two seconds run stree once", () =>
    Effect.gen(function* () {
      const { service, runs } = yield* setup({ printed: () => tree });
      yield* service.view({ cwd: "/repo" });
      yield* service.view({ cwd: "/repo" });
      yield* service.view({ cwd: "/other" });
      expect(runs).toEqual(["/repo", "/other"]);
      yield* TestClock.adjust("2 seconds");
      yield* service.view({ cwd: "/repo" });
      expect(runs).toEqual(["/repo", "/other", "/repo"]);
    }).pipe(Effect.scoped),
  );
});

describe("StreeView: every open project's bridge, not only the one being looked at", () => {
  it.effect("on start, and every 30 seconds, each open project with a tree gets its bridge", () =>
    Effect.gen(function* () {
      const printed: Record<string, Printed> = { "/a": tree, "/plain": noTree, "/later": tree };
      const { ensured, projects } = yield* setup({
        printed: (cwd) => printed[cwd] ?? noTree,
        projects: [shell("/a"), shell("/plain")],
      });
      expect(yield* Queue.take(ensured)).toBe("/a");

      projects.push(shell("/later"));
      yield* TestClock.adjust("30 seconds");
      expect([yield* Queue.take(ensured), yield* Queue.take(ensured)]).toEqual(["/a", "/later"]);
      expect(yield* Queue.size(ensured)).toBe(0);
    }).pipe(Effect.scoped),
  );
});
