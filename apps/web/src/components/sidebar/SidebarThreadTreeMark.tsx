import type { EnvironmentId, ThreadId } from "@t3tools/contracts";

import { TREE_INDENT_PX } from "./threadTree";
import { useRunningSubagentCount } from "./useRunningSubagentCount";

const GUTTER_PX = 14;
const DOT_PX = 8;

export function treeTitleInset(depth: number) {
  return 36 + depth * TREE_INDENT_PX;
}

/** A grey line up to the parent, a dot, and a short line off it while inner sessions run. Sits in the row's left gutter. */
export function SidebarThreadTreeMark(props: {
  depth: number;
  lastChild: boolean;
  environmentId: EnvironmentId;
  threadId: ThreadId;
}) {
  const { depth, lastChild } = props;
  const inner = useRunningSubagentCount(props.environmentId, props.threadId);
  const dotX = GUTTER_PX + depth * TREE_INDENT_PX;
  const parentX = dotX - TREE_INDENT_PX + DOT_PX / 2;
  return (
    <span aria-hidden data-testid="thread-tree-mark">
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
      {inner > 0 ? (
        <span
          role="img"
          aria-label={`${inner} subagent${inner === 1 ? "" : "s"} running`}
          className="absolute top-1/2 h-px w-1.5 bg-foreground/60"
          style={{ insetInlineStart: dotX + DOT_PX }}
        />
      ) : null}
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-foreground"
        style={{ insetInlineStart: dotX, width: DOT_PX, height: DOT_PX }}
      />
    </span>
  );
}
