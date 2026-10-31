import type { SidebarThreadSummary } from "../../types";
import type { SidebarThreadStatus } from "../Sidebar.logic";

export interface ThreadTreePlace {
  readonly thread: SidebarThreadSummary;
  readonly depth: number;
  readonly lastChild: boolean;
}

type TreeThread = Pick<SidebarThreadSummary, "id" | "environmentId" | "lineage">;

const keyOf = (thread: Pick<SidebarThreadSummary, "id" | "environmentId">) =>
  `${thread.environmentId}:${thread.id}`;

/** Depth-first by `lineage.parentThreadId`; a thread whose parent is not in the list is a root. */
export function orderThreadsAsTree<T extends TreeThread>(
  threads: ReadonlyArray<T>,
): ReadonlyArray<{ thread: T; depth: number; lastChild: boolean }> {
  const present = new Set(threads.map(keyOf));
  const children = new Map<string, T[]>();
  const roots: T[] = [];
  for (const thread of threads) {
    const parentId = thread.lineage.parentThreadId;
    const parentKey = parentId === null ? null : `${thread.environmentId}:${parentId}`;
    if (parentKey === null || !present.has(parentKey) || parentKey === keyOf(thread)) {
      roots.push(thread);
      continue;
    }
    const siblings = children.get(parentKey);
    if (siblings) siblings.push(thread);
    else children.set(parentKey, [thread]);
  }
  const out: { thread: T; depth: number; lastChild: boolean }[] = [];
  const seen = new Set<string>();
  const walk = (list: ReadonlyArray<T>, depth: number) => {
    list.forEach((thread, index) => {
      const key = keyOf(thread);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ thread, depth, lastChild: index === list.length - 1 });
      walk(children.get(key) ?? [], depth + 1);
    });
  };
  walk(roots, 0);
  // A parent cycle leaves its members unreached; keep them listed.
  for (const thread of threads) {
    if (!seen.has(keyOf(thread))) out.push({ thread, depth: 0, lastChild: true });
  }
  return out;
}

/** The ring around a thread's dot, as session-tree's map colours it; null draws none. */
export function treeRingTone(
  status: SidebarThreadStatus,
): "working" | "turn" | "blocked" | "ready" | null {
  switch (status) {
    case "working":
      return "working";
    case "waiting":
      return "turn";
    case "approval":
    case "input":
    case "request":
      return "blocked";
    case "ready":
      return "ready";
    default:
      return null;
  }
}
