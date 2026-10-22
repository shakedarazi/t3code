// signpost: from what `stree view` said to the rows of the map (fork, see FORK.md). session-tree decides the nodes,
// their order, and the thread each opens; this only names them in Hebrew: the thread's sidebar title, else the node's
// goal, never a long id.
import { isStreeMissing, type StreeViewResult } from "@t3tools/contracts";

import { SAID } from "./signpost.logic";

const NO_NAME = "בלי שם";

export interface MapRow {
  /** The node's id: a React key, never shown. */
  readonly key: string;
  readonly depth: number;
  readonly label: string;
  /** Where the person is now (the cursor). */
  readonly here: boolean;
  /** The node the signpost points to. */
  readonly target: boolean;
  /** Short Hebrew markings, in order: trunk or sub-trunk, async, the turn or what waits, not visited yet. */
  readonly marks: readonly string[];
  /** The thread to open on click, or null: no thread, or the person is already in it. */
  readonly threadId: string | null;
}

/** The map's rows in tree order, as session-tree gave them, or null when there is no map to show. */
export function signpostMap(input: {
  /** null when the read failed. */
  readonly result: StreeViewResult | null;
  /** The thread's title as the sidebar shows it, or null when it does not have it. */
  readonly titleOf: (threadId: string) => string | null;
  readonly currentThreadId: string | null;
}): MapRow[] | null {
  if (input.result === null || isStreeMissing(input.result)) return null;
  const { view } = input.result;
  if (!view.tree) return null;
  const threadOf = new Map(view.map.nodes.map((n) => [n.id, n.thread]));
  return view.map.nodes.map((n) => {
    // An inner session opens its parent's thread: that title is the parent's, not its own.
    const own = n.thread !== null && (n.parent === null || threadOf.get(n.parent) !== n.thread);
    const title = own && n.thread !== null ? input.titleOf(n.thread) : null;
    const marks: string[] = [];
    if (n.parent === null) marks.push("גזע");
    if (n.subtrunk) marks.push("תת-גזע");
    if (n.mode === "async") marks.push("async");
    if (n.waiting !== null) marks.push(SAID[n.waiting]);
    else if (n.turn !== null) marks.push(SAID[n.turn]);
    else if (n.state === "open" && n.mode === "sync") marks.push("עוד לא נכנסת");
    return {
      key: n.id,
      depth: n.depth,
      label: title || n.goal || NO_NAME,
      here: n.id === view.map.cursor.node,
      target: n.target,
      marks,
      threadId: n.thread === input.currentThreadId ? null : n.thread,
    };
  });
}
