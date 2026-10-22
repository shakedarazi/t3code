import { describe, expect, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as Queue from "effect/Queue";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import { ChildProcessSpawner } from "effect/process";

import * as ProcessRunner from "../processRunner.ts";
import * as BridgeLauncher from "./BridgeLauncher.ts";

const NO_TOKEN = JSON.stringify({
  ok: false,
  error: "no-token",
  message: "no T3 token",
  path: "/home/s/.config/stree/t3-token",
});

/** git's common dir of each folder: two copies of one repo, and another repo. */
const COMMON_DIRS: Record<string, string> = {
  "/repo": "/repo/.git",
  "/repo-copy": "/repo/.git",
  "/other": "/other/.git",
};

const gitOutput = (stdout: string, code: number): ProcessRunner.ProcessRunOutput => ({
  stdout,
  stderr: "",
  code: code as ProcessRunner.ProcessRunOutput["code"],
  timedOut: false,
  stdoutTruncated: false,
  stderrTruncated: false,
  stdoutInvalidUtf8: false,
  stderrInvalidUtf8: false,
});

/** A launcher whose `stree bridge` children are fakes: each either runs on, or exits at once saying no token. */
const setup = Effect.fn(function* (bridge: "runs" | "no-token") {
  const spawned = yield* Queue.unbounded<string>();
  const tokenChecked = yield* Deferred.make<void>();
  const spawner = ChildProcessSpawner.make((command) =>
    Effect.gen(function* () {
      yield* Queue.offer(spawned, (command as { options: { cwd?: string } }).options.cwd ?? "");
      return ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(1),
        exitCode:
          bridge === "runs" ? Effect.never : Effect.succeed(ChildProcessSpawner.ExitCode(2)),
        isRunning: Effect.succeed(bridge === "runs"),
        kill: () => Effect.void,
        unref: Effect.succeed(Effect.void),
        stdin: Sink.drain,
        stdout: bridge === "runs" ? Stream.empty : Stream.encodeText(Stream.make(`${NO_TOKEN}\n`)),
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
      });
    }),
  );
  const layer = Layer.effect(BridgeLauncher.BridgeLauncher, BridgeLauncher.make).pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Layer.succeed(ProcessRunner.ProcessRunner, {
          run: (run) =>
            Effect.sync(() => {
              const dir = COMMON_DIRS[run.args[1] ?? ""];
              return dir === undefined ? gitOutput("", 128) : gitOutput(`${dir}\n`, 0);
            }),
        }),
        FileSystem.layerNoop({
          realPath: (path) => Effect.succeed(path),
          // The token file is not there. Only its stat is ever asked for.
          stat: (path) =>
            Deferred.succeed(tokenChecked, undefined).pipe(
              Effect.andThen(
                Effect.fail(
                  PlatformError.systemError({
                    _tag: "NotFound",
                    module: "FileSystem",
                    method: "stat",
                    pathOrDescriptor: path,
                  }),
                ),
              ),
            ),
        }),
        Path.layer,
      ),
    ),
  );
  const context = yield* Layer.build(layer);
  const launcher = yield* Effect.service(BridgeLauncher.BridgeLauncher).pipe(
    Effect.provide(context),
  );
  return { launcher, spawned, tokenChecked };
});

describe("BridgeLauncher.ensure", () => {
  it.effect("one bridge per git common dir, however many copies of the repo are open", () =>
    Effect.gen(function* () {
      const { launcher, spawned } = yield* setup("runs");
      expect(yield* launcher.ensure("/repo")).toBe("running");
      expect(yield* launcher.ensure("/repo-copy")).toBe("running");
      expect(yield* launcher.ensure("/other")).toBe("running");
      expect(yield* launcher.ensure("/repo")).toBe("running");
      const started = [yield* Queue.take(spawned), yield* Queue.take(spawned)];
      yield* TestClock.adjust("1 minute");
      expect(started.toSorted()).toEqual(["/other", "/repo"]);
      expect(yield* Queue.size(spawned)).toBe(0);
    }).pipe(Effect.scoped),
  );

  it.effect("outside a git repo: no bridge", () =>
    Effect.gen(function* () {
      const { launcher, spawned } = yield* setup("runs");
      expect(yield* launcher.ensure("/not-a-repo")).toBeNull();
      yield* TestClock.adjust("1 minute");
      expect(yield* Queue.size(spawned)).toBe(0);
    }).pipe(Effect.scoped),
  );

  it.effect("a bridge with no token is not started again until the token file changes", () =>
    Effect.gen(function* () {
      const { launcher, spawned, tokenChecked } = yield* setup("no-token");
      yield* launcher.ensure("/repo");
      expect(yield* Queue.take(spawned)).toBe("/repo");
      yield* Deferred.await(tokenChecked);
      yield* TestClock.adjust("5 minutes");
      expect(yield* launcher.ensure("/repo")).toBe("no-token");
      yield* TestClock.adjust("5 minutes");
      expect(yield* Queue.size(spawned)).toBe(0);
    }).pipe(Effect.scoped),
  );
});
