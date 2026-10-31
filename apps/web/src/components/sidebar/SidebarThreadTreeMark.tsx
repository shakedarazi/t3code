import { cn } from "~/lib/utils";
import type { SidebarThreadStatus } from "../Sidebar.logic";
import { treeRingTone } from "./threadTree";

const TREE_INDENT_PX = 12;
const GUTTER_PX = 14;
const DOT_PX = 8;

const RING_CLASS = {
  working: "border-success",
  turn: "border-info",
  blocked: "border-warning",
  ready: "border-[#961c2a]",
} as const;

export function treeTitleInset(depth: number) {
  return 36 + depth * TREE_INDENT_PX;
}

/** A grey line up to the parent, and a dot ringed by the thread's state. Sits in the row's left gutter. */
export function SidebarThreadTreeMark(props: {
  depth: number;
  lastChild: boolean;
  status: SidebarThreadStatus;
}) {
  const { depth, lastChild, status } = props;
  const tone = treeRingTone(status);
  const dotX = GUTTER_PX + depth * TREE_INDENT_PX;
  const parentX = dotX - TREE_INDENT_PX + DOT_PX / 2;
  return (
    <span aria-hidden data-testid="thread-tree-mark" data-ring={tone ?? "none"}>
      {depth > 0 ? (
        <>
          <span
            className="absolute top-0 w-px bg-border"
            style={{ insetInlineStart: parentX, height: lastChild ? "50%" : "100%" }}
          />
          <span
            className="absolute top-1/2 h-px bg-border"
            style={{ insetInlineStart: parentX, width: TREE_INDENT_PX - DOT_PX / 2 - 1 }}
          />
        </>
      ) : null}
      <span
        className={cn(
          "absolute top-1/2 box-content -translate-y-1/2 rounded-full bg-foreground",
          tone ? cn("border-2", RING_CLASS[tone]) : "border-2 border-transparent",
        )}
        style={{
          insetInlineStart: dotX - 2,
          width: DOT_PX - 4,
          height: DOT_PX - 4,
        }}
      />
    </span>
  );
}
