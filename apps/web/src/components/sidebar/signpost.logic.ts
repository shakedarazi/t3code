// signpost: from what `stree view` said to the sidebar row (fork, see FORK.md). session-tree decides where and why;
// this only says it in Hebrew, with the thread's sidebar title, and a link unless the person is already there.
import {
  isStreeMissing,
  type StreeTurn,
  type StreeViewResult,
  type StreeWaiting,
  type StreeWhy,
} from "@t3tools/contracts";

const SIGNPOST_UNAVAILABLE = "השלט לא זמין";
const STREE_MISSING = `${SIGNPOST_UNAVAILABLE}: stree לא מותקן`;
const BRIDGE_NO_TOKEN = "הגשר לא רץ: חסר token";
const BRIDGE_NOT_BOUND = "הגשר עוד לא רץ כאן";

/** Every word session-tree says that the row or the map shows, in Hebrew. */
export const SAID: Record<StreeWhy | StreeWaiting | StreeTurn, string> = {
  "your-turn": "תורך",
  "waiting-for-you": "מחכה לתשובה שלך",
  "result-back": "חזרה תוצאה",
  "with-agents": "הכל אצל הסוכנים",
  question: "מחכה לתשובה שלך",
  conflict: "קונפליקט במיזוג",
  result: "חזרה תוצאה",
  you: "תורך",
  agent: "תור הסוכן",
};

export type SignpostRow =
  | { readonly kind: "hidden" }
  | { readonly kind: "unavailable"; readonly text: string }
  /** threadId: the thread to open on click, or null for no navigation. */
  | { readonly kind: "row"; readonly text: string; readonly threadId: string | null };

const UNAVAILABLE: SignpostRow = { kind: "unavailable", text: SIGNPOST_UNAVAILABLE };

export function signpostRow(input: {
  /** null when the read failed. */
  readonly result: StreeViewResult | null;
  /** The thread's title as the sidebar shows it, or null when it does not have it. */
  readonly titleOf: (threadId: string) => string | null;
  readonly currentThreadId: string | null;
}): SignpostRow {
  if (input.result === null) return UNAVAILABLE;
  // Not on the PATH T3 sees: the person's install step, so it shows, unlike a project with no tree.
  if (isStreeMissing(input.result)) return { kind: "unavailable", text: STREE_MISSING };
  const { view, launcher } = input.result;
  if (!view.tree) return { kind: "hidden" };
  // Without a running bridge the log no longer follows T3, so the row's target may be stale.
  if (launcher === "no-token") return { kind: "row", text: BRIDGE_NO_TOKEN, threadId: null };
  if (launcher === "restarting") return UNAVAILABLE;
  const why = SAID[view.signpost.why];
  if (!view.bridge.bound)
    return { kind: "row", text: `${why} · ${BRIDGE_NOT_BOUND}`, threadId: null };
  const { thread } = view.signpost;
  const title = thread === null ? null : input.titleOf(thread);
  return {
    kind: "row",
    text: title ? `${why}: ${title}` : why,
    threadId: thread === input.currentThreadId ? null : thread,
  };
}
