import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

import { environmentThreadShells } from "../../state/threads";

const RUNNING = new Set(["preparing", "queued", "starting", "running", "waiting"]);

const runningSubagentCountAtom = Atom.family((key: string) => {
  const [environmentId, threadId] = key.split("\u0000") as [EnvironmentId, ThreadId];
  return Atom.make((get) => {
    let count = 0;
    for (const shell of get(environmentThreadShells.environmentThreadsAtom(environmentId))) {
      if (
        shell.lineage.parentThreadId === threadId &&
        shell.lineage.relationshipToParent === "subagent" &&
        shell.archivedAt === null &&
        RUNNING.has(shell.status)
      ) {
        count += 1;
      }
    }
    return count;
  });
});

/** Subagents running under a thread: its inner sessions, drawn as a short line off its dot. */
export function useRunningSubagentCount(environmentId: EnvironmentId, threadId: ThreadId) {
  return useAtomValue(runningSubagentCountAtom(`${environmentId}\u0000${threadId}`));
}
