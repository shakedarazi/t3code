import type { StreeMapNode, StreeViewResult } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { signpostMap } from "./signpostMap.logic";

const node = (
  id: string,
  parent: string | null,
  depth: number,
  more: Partial<StreeMapNode> = {},
): StreeMapNode => ({
  id,
  parent,
  depth,
  mode: "sync",
  state: "active",
  turn: null,
  subtrunk: false,
  waiting: null,
  target: false,
  goal: null,
  thread: id,
  ...more,
});
const answer = (
  cursor: { node: string | null; thread: string | null },
  nodes: StreeMapNode[],
): StreeViewResult => ({
  view: {
    tree: true,
    bridge: { bound: true },
    signpost: { why: "with-agents", node: null, thread: null },
    map: { cursor, nodes },
  },
});
const titles: Record<string, string> = { "thr-trunk": "Main work", "thr-a": "Port the exporter" };
const titleOf = (id: string) => titles[id] ?? null;
const map = (result: StreeViewResult | null, currentThreadId: string | null = "thr-a") =>
  signpostMap({ result, titleOf, currentThreadId });

describe("signpostMap: from what stree view said to the rows of the map", () => {
  it("no tree, stree not installed, or a failed read: no map", () => {
    expect(map({ view: { tree: false } })).toBeNull();
    expect(map({ stree: "missing" })).toBeNull();
    expect(map(null)).toBeNull();
  });

  it("each node as one row, in tree order, with its depth and every marking in Hebrew", () => {
    const rows = map(
      answer({ node: "thr-a", thread: "thr-a" }, [
        node("trunk", null, 0, { turn: "you", goal: "ship", thread: "thr-trunk" }),
        node("thr-a", "trunk", 1, { turn: "agent", subtrunk: true, goal: "port" }),
        node("thr-s", "thr-a", 2, {
          mode: "async",
          state: "blocked_on_you",
          waiting: "question",
          target: true,
          goal: "scan the logs",
          thread: "thr-a",
        }),
        node("thr-d", "thr-a", 2, { mode: "async", state: "done", waiting: "result" }),
        node("thr-w", "thr-a", 2, { mode: "async", state: "blocked_on_you", waiting: "conflict" }),
        node("thr-o", "trunk", 1, { state: "open", goal: "price" }),
      ]),
    );
    expect(rows).toEqual([
      {
        key: "trunk",
        depth: 0,
        label: "Main work",
        here: false,
        target: false,
        marks: ["גזע", "תורך"],
        threadId: "thr-trunk",
      },
      {
        key: "thr-a",
        depth: 1,
        label: "Port the exporter",
        here: true,
        target: false,
        marks: ["תת-גזע", "תור הסוכן"],
        // Already there: no navigation.
        threadId: null,
      },
      {
        // An inner session: its parent's thread, so not its parent's title; its goal. A click opens the parent's.
        key: "thr-s",
        depth: 2,
        label: "scan the logs",
        here: false,
        target: true,
        marks: ["async", "מחכה לתשובה שלך"],
        threadId: null,
      },
      {
        // Neither a title nor a goal: no long id on the screen.
        key: "thr-d",
        depth: 2,
        label: "בלי שם",
        here: false,
        target: false,
        marks: ["async", "חזרה תוצאה"],
        threadId: "thr-d",
      },
      {
        key: "thr-w",
        depth: 2,
        label: "בלי שם",
        here: false,
        target: false,
        marks: ["async", "קונפליקט במיזוג"],
        threadId: "thr-w",
      },
      {
        key: "thr-o",
        depth: 1,
        label: "price",
        here: false,
        target: false,
        marks: ["עוד לא נכנסת"],
        threadId: "thr-o",
      },
    ]);
  });

  it("unbound: no thread, so no title and no link; the goal names it", () => {
    const rows = map(
      answer({ node: "trunk", thread: null }, [
        node("trunk", null, 0, { goal: "ship", thread: null, turn: "you" }),
      ]),
    );
    expect(rows).toEqual([
      {
        key: "trunk",
        depth: 0,
        label: "ship",
        here: true,
        target: false,
        marks: ["גזע", "תורך"],
        threadId: null,
      },
    ]);
  });
});
