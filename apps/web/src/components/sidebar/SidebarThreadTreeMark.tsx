import { TREE_INDENT_PX, treeLineContinues } from "./threadTree";

const FIRST_MARK_CENTER_PX = 18.5;
const MARK_PX = 7;
const ROOT_MARK_PX = 12;
const LINE_PX = 2;

const markCenter = (depth: number) => FIRST_MARK_CENTER_PX + depth * TREE_INDENT_PX;
const lineX = (depth: number) => markCenter(depth - 1) - LINE_PX / 2;

export function treeTitleInset(depth: number) {
  return 36 + depth * TREE_INDENT_PX;
}

/** Grey lines through the row, up to the parent and down to children, and a mark, in the left gutter. */
export function SidebarThreadTreeMark(props: { depth: number; lines: number }) {
  const { depth, lines } = props;
  const markPx = depth === 0 ? ROOT_MARK_PX : MARK_PX;
  const markStart = markCenter(depth) - markPx / 2;
  const passing = Array.from({ length: Math.max(depth - 1, 0) }, (_, index) => index + 1).filter(
    (ancestorDepth) => treeLineContinues(lines, ancestorDepth),
  );
  return (
    <span aria-hidden data-testid="thread-tree-mark">
      {passing.map((ancestorDepth) => (
        <span
          key={ancestorDepth}
          className="absolute inset-y-0 w-0.5 bg-foreground/20"
          style={{ insetInlineStart: lineX(ancestorDepth) }}
        />
      ))}
      {depth > 0 ? (
        <>
          <span
            className="absolute top-0 w-0.5 bg-foreground/20"
            style={{
              insetInlineStart: lineX(depth),
              height: treeLineContinues(lines, depth) ? "100%" : "50%",
            }}
          />
          <span
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/20"
            style={{ insetInlineStart: lineX(depth), width: markStart - lineX(depth) }}
          />
        </>
      ) : null}
      {treeLineContinues(lines, depth + 1) ? (
        // Starts below the mark, so a hollow root stays empty on any row background.
        <span
          className="absolute bottom-0 w-0.5 bg-foreground/20"
          style={{ insetInlineStart: lineX(depth + 1), top: `calc(50% + ${markPx / 2}px)` }}
        />
      ) : null}
      <span
        className={
          depth === 0
            ? "absolute top-1/2 -translate-y-1/2 rounded-sm border-2 border-foreground/50"
            : "absolute top-1/2 -translate-y-1/2 rounded-xs bg-foreground/35"
        }
        style={{ insetInlineStart: markStart, width: markPx, height: markPx }}
      />
    </span>
  );
}
