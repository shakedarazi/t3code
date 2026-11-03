import { describe, expect, it } from "vite-plus/test";

import { orderThreadsAsTree, treeLineContinues } from "./threadTree";

const t = (id: string, parentThreadId: string | null) =>
  ({ id, environmentId: "e", lineage: { parentThreadId } }) as never as Parameters<
    typeof orderThreadsAsTree
  >[0][number];

describe("orderThreadsAsTree", () => {
  it("nests children under their parent, keeps orphans as roots, survives cycles", () => {
    const placed = orderThreadsAsTree([
      t("c1", "a"),
      t("b", null),
      t("a", null),
      t("g", "c1"),
      t("c2", "a"),
      t("o", "gone"),
      t("x", "y"),
      t("y", "x"),
    ]);
    expect(placed.map((p) => `${p.thread.id}:${p.depth}`)).toEqual([
      "b:0",
      "a:0",
      "c1:1",
      "g:2",
      "c2:1",
      "o:0",
      "x:0",
      "y:0",
    ]);
    const lineAtDepthOne = (id: string) =>
      treeLineContinues(placed.find((p) => p.thread.id === id)!.lines, 1);
    expect(lineAtDepthOne("c1")).toBe(true);
    // A grandchild's row carries on the line to its parent's next sibling.
    expect(lineAtDepthOne("g")).toBe(true);
    expect(lineAtDepthOne("c2")).toBe(false);
    // A row with children sends a line down out of its dot; a childless one does not.
    const lineBelow = (id: string) => {
      const place = placed.find((p) => p.thread.id === id)!;
      return treeLineContinues(place.lines, place.depth + 1);
    };
    expect(["a", "c1", "g", "c2"].map(lineBelow)).toEqual([true, true, false, false]);
  });
});
