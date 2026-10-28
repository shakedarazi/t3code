// Fork (session-tree): every time a client shows a thread, the server hears it, so the thread T3 shows is on the shell.
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import type { VisitThreadInput } from "./threadCommands.ts";
import { createThreadShownReporter } from "./threadShown.ts";

const environmentId = EnvironmentId.make("env-shown");

interface Shell {
  readonly environmentId: EnvironmentId;
  readonly id: ThreadId;
  readonly updatedAt: string;
  readonly lastVisitedAt?: string | null;
}

const at = (seconds: number) => `2026-01-01T00:00:${String(seconds).padStart(2, "0")}.000Z`;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(initial: Omit<Shell, "environmentId" | "id"> | null) {
  const threadId = ThreadId.make("thread-shown");
  const ref = { environmentId, threadId };
  const shellAtom = Atom.make<Shell | null>(
    initial === null ? null : { environmentId, id: threadId, ...initial },
  );
  const visits: Array<VisitThreadInput> = [];
  const reporter = createThreadShownReporter({
    threadShellAtom: () => shellAtom,
    visit: {
      label: "test-shown",
      run: async (_registry, value) => {
        visits.push(value.input);
        return AsyncResult.success(undefined);
      },
    },
  });
  const registry = AtomRegistry.make();
  return {
    ref,
    visits,
    show: () => registry.mount(reporter(ref)),
    update: (patch: Partial<Shell>) => {
      const current = registry.get(shellAtom);
      registry.set(shellAtom, {
        environmentId,
        id: threadId,
        updatedAt: at(0),
        ...current,
        ...patch,
      });
    },
  };
}

it("tells the server each time the thread is shown, a read one too, without moving its watermark", () => {
  const t = setup({ updatedAt: at(10), lastVisitedAt: at(10) });
  const leave = t.show();
  expect(t.visits).toEqual([{ threadId: t.ref.threadId, visitedAt: at(10), shown: true }]);

  // Activity while it stays shown is the visit tracker's, not a new show.
  t.update({ updatedAt: at(20) });
  expect(t.visits).toHaveLength(1);

  // Another thread, then back: shown again, however soon (no dedupe, unlike opens).
  leave();
  vi.runAllTimers(); // the registry lets go of a thread left in a task
  t.show();
  expect(t.visits).toHaveLength(2);
  expect(t.visits[1]).toEqual({ threadId: t.ref.threadId, visitedAt: at(10), shown: true });
});

it("waits for the shell, and a never-visited thread is visited up to its last update", () => {
  const t = setup(null);
  t.show();
  expect(t.visits).toEqual([]);
  t.update({ updatedAt: at(12), lastVisitedAt: null });
  expect(t.visits).toEqual([{ threadId: t.ref.threadId, visitedAt: at(12), shown: true }]);
});

it("says nothing to a server without visit tracking", () => {
  const t = setup({ updatedAt: at(10) });
  t.show();
  expect(t.visits).toEqual([]);
});
