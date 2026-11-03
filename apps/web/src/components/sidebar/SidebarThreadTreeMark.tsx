import { TREE_INDENT_PX, treeLineContinues } from "./threadTree";

const GUTTER_PX = 14;
const DOT_PX = 8;

const dotX = (depth: number) => GUTTER_PX + depth * TREE_INDENT_PX;
const lineX = (depth: number) => dotX(depth - 1) + DOT_PX / 2;

export function treeTitleInset(depth: number) {
  return 36 + depth * TREE_INDENT_PX;
}

/** Grey lines through the row, up to the parent and down to children, and a dot, in the left gutter. */
export function SidebarThreadTreeMark(props: { depth: number; lines: number }) {
  const { depth, lines } = props;
  const passing = Array.from({ length: Math.max(depth - 1, 0) }, (_, index) => index + 1).filter(
    (ancestorDepth) => treeLineContinues(lines, ancestorDepth),
  );
  return (
    <span aria-hidden data-testid="thread-tree-mark">
      {passing.map((ancestorDepth) => (
        <span
          key={ancestorDepth}
          className="absolute inset-y-0 w-[1.5px] bg-foreground/25"
          style={{ insetInlineStart: lineX(ancestorDepth) }}
        />
      ))}
      {depth > 0 ? (
        <>
          <span
            className="absolute top-0 w-[1.5px] bg-foreground/25"
            style={{
              insetInlineStart: lineX(depth),
              height: treeLineContinues(lines, depth) ? "100%" : "50%",
            }}
          />
          <span
            className="absolute top-1/2 h-[1.5px] bg-foreground/25"
            style={{ insetInlineStart: lineX(depth), width: TREE_INDENT_PX - DOT_PX / 2 - 1 }}
          />
        </>
      ) : null}
      {treeLineContinues(lines, depth + 1) ? (
        <span
          className="absolute top-1/2 bottom-0 w-[1.5px] bg-foreground/25"
          style={{ insetInlineStart: lineX(depth + 1) }}
        />
      ) : null}
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-foreground"
        style={{ insetInlineStart: dotX(depth), width: DOT_PX, height: DOT_PX }}
      />
    </span>
  );
}
