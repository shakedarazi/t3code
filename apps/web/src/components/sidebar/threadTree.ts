import type { SidebarThreadSummary } from "../../types";

export const TREE_INDENT_PX = 12;

type TreeThread = Pick<SidebarThreadSummary, "id" | "environmentId" | "lineage">;

const keyOf = (thread: Pick<SidebarThreadSummary, "id" | "environmentId">) =>
  `${thread.environmentId}:${thread.id}`;

/** Whether a row's `lines` carry the vertical line of `depth` past the row. */
export const treeLineContinues = (lines: number, depth: number) => (lines & (1 << depth)) !== 0;

/**
 * Depth-first by `lineage.parentThreadId`; a thread whose parent is not in the list is a root.
 * `lines` is a number so a memoized row can take it as a prop.
 */
export function orderThreadsAsTree<T extends TreeThread>(
  threads: ReadonlyArray<T>,
): ReadonlyArray<{ thread: T; depth: number; lines: number }> {
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
  const out: { thread: T; depth: number; lines: number }[] = [];
  const seen = new Set<string>();
  const walk = (list: ReadonlyArray<T>, depth: number, inherited: number) => {
    list.forEach((thread, index) => {
      const key = keyOf(thread);
      if (seen.has(key)) return;
      seen.add(key);
      const lines = index === list.length - 1 ? inherited : inherited | (1 << depth);
      out.push({ thread, depth, lines });
      walk(children.get(key) ?? [], depth + 1, lines);
    });
  };
  walk(roots, 0, 0);
  // A parent cycle leaves its members unreached; keep them listed.
  for (const thread of threads) {
    if (!seen.has(keyOf(thread))) out.push({ thread, depth: 0, lines: 0 });
  }
  return out;
}
