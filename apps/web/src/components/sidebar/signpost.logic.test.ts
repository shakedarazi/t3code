import type { StreeViewRan, StreeViewResult } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { signpostRow } from "./signpost.logic";

type Signpost = Extract<StreeViewRan["view"], { tree: true }>["signpost"];

const answer = (
  signpost: Signpost,
  more: { bound?: boolean; launcher?: StreeViewRan["launcher"] } = {},
): StreeViewResult => ({
  view: {
    tree: true,
    bridge: { bound: more.bound ?? true },
    signpost,
    map: { cursor: { node: null, thread: null }, nodes: [] },
  },
  ...(more.launcher === undefined ? {} : { launcher: more.launcher }),
});
const titles: Record<string, string> = { "thr-a": "Port the exporter", "thr-trunk": "Main work" };
const titleOf = (id: string) => titles[id] ?? null;
const row = (result: StreeViewResult | null, currentThreadId: string | null = "thr-trunk") =>
  signpostRow({ result, titleOf, currentThreadId });

describe("signpostRow: from what stree view said to the sidebar row", () => {
  it("no tree: no row", () => {
    expect(row({ view: { tree: false } })).toEqual({ kind: "hidden" });
  });

  it("stree not on the PATH T3 sees: not installed, said, without a link; not hidden like no tree", () => {
    expect(row({ stree: "missing" })).toEqual({
      kind: "unavailable",
      text: "השלט לא זמין: stree לא מותקן",
    });
  });

  it("each why in Hebrew, with the thread's sidebar title, and a link to it", () => {
    const cases = [
      ["waiting-for-you", "מחכה לתשובה שלך"],
      ["your-turn", "תורך"],
      ["result-back", "חזרה תוצאה"],
    ] as const;
    for (const [why, said] of cases) {
      expect(row(answer({ why, node: "thr-s", thread: "thr-a" }))).toEqual({
        kind: "row",
        text: `${said}: Port the exporter`,
        threadId: "thr-a",
      });
    }
  });

  it("nowhere to go: everything is with the agents, no link", () => {
    expect(row(answer({ why: "with-agents", node: null, thread: null }))).toEqual({
      kind: "row",
      text: "הכל אצל הסוכנים",
      threadId: null,
    });
  });

  it("the bridge has not run here yet: the why, and that the bridge is not running here, no link", () => {
    expect(
      row(answer({ why: "your-turn", node: "trunk", thread: null }, { bound: false })),
    ).toEqual({
      kind: "row",
      text: "תורך · הגשר עוד לא רץ כאן",
      threadId: null,
    });
  });

  it("the thread the person is already in: no link, so no navigation", () => {
    expect(row(answer({ why: "your-turn", node: "trunk", thread: "thr-trunk" }))).toEqual({
      kind: "row",
      text: "תורך: Main work",
      threadId: null,
    });
  });

  it("a thread the sidebar does not show yet: the why, still a link", () => {
    expect(row(answer({ why: "your-turn", node: "x", thread: "thr-new" }))).toEqual({
      kind: "row",
      text: "תורך",
      threadId: "thr-new",
    });
  });

  it("the bridge T3 starts has no token: the row says so, without a link", () => {
    const signpost = { why: "your-turn", node: "x", thread: "thr-a" } as const;
    expect(row(answer(signpost, { launcher: "no-token" }), null)).toEqual({
      kind: "row",
      text: "הגשר לא רץ: חסר token",
      threadId: null,
    });
    expect(row(answer(signpost, { launcher: "running" }), null)).toEqual({
      kind: "row",
      text: "תורך: Port the exporter",
      threadId: "thr-a",
    });
  });

  it("the bridge is restarting, or the read failed: unavailable, not a target that may be stale", () => {
    const signpost = { why: "your-turn", node: "x", thread: "thr-a" } as const;
    expect(row(answer(signpost, { launcher: "restarting" }))).toEqual({
      kind: "unavailable",
      text: "השלט לא זמין",
    });
    expect(row(null)).toEqual({ kind: "unavailable", text: "השלט לא זמין" });
  });
});
