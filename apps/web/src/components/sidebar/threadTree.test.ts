import { describe, expect, it } from "vite-plus/test";

import { orderThreadsAsTree, treeRingTone } from "./threadTree";

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
      t("o", "gone"),
      t("x", "y"),
      t("y", "x"),
    ]);
    expect(placed.map((p) => `${p.thread.id}:${p.depth}`)).toEqual([
      "b:0",
      "a:0",
      "c1:1",
      "g:2",
      "o:0",
      "x:0",
      "y:0",
    ]);
    expect(placed.find((p) => p.thread.id === "c1")?.lastChild).toBe(true);
  });

  it("maps states to rings", () => {
    expect(treeRingTone("input")).toBe("blocked");
    expect(treeRingTone("failed")).toBeNull();
  });
});
