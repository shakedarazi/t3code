// signpost: the map of the session tree, opened from the signpost row (fork, see FORK.md). It reads the same
// `stree view` query as the row, no endpoint of its own, and does nothing but open a thread: no closing, no
// cancelling, no marking. Quiet like the row: no sound, no flash, no animation of its own.
import { useState } from "react";

import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "../ui/dialog";
import { signpostMap, type MapRow } from "./signpostMap.logic";
import { useSignpost, type SignpostWhere } from "./useSignpost";

/** A small "מפה" button beside the signpost row, and the map it opens. Nothing while there is no map. */
export function SignpostMap(props: SignpostWhere) {
  const { answer, titleOf, open } = useSignpost(props);
  const [shown, setShown] = useState(false);
  const rows = signpostMap({ result: answer, titleOf, currentThreadId: props.currentThreadId });
  if (rows === null) return null;

  const go = (threadId: string) => {
    setShown(false);
    open(threadId);
  };

  return (
    <>
      <button
        type="button"
        dir="rtl"
        onClick={() => setShown(true)}
        className="shrink-0 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        מפה
      </button>
      <Dialog open={shown} onOpenChange={setShown}>
        <DialogPopup className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>המפה</DialogTitle>
          </DialogHeader>
          <DialogPanel>
            <ul className="space-y-0.5">
              {rows.map((row) => (
                <MapNodeRow key={row.key} row={row} onOpen={go} />
              ))}
            </ul>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </>
  );
}

function MapNodeRow(props: { row: MapRow; onOpen: (threadId: string) => void }) {
  const { row, onOpen } = props;
  const { threadId } = row;
  const body = (
    <>
      <span className={`truncate ${row.here ? "font-semibold text-foreground" : ""}`}>
        {row.label}
      </span>
      {row.here && <Mark strong>אתה כאן</Mark>}
      {row.target && <Mark strong>השלט</Mark>}
      {row.marks.map((m) => (
        <Mark key={m}>{m}</Mark>
      ))}
    </>
  );
  const className = `flex w-full items-center gap-1.5 rounded-md py-1 pe-2 text-start text-sm ${
    row.here ? "bg-accent" : ""
  } ${row.target ? "ring-1 ring-primary/60" : ""}`;
  // Indent by depth, on the start side: right, in RTL.
  const style = { paddingInlineStart: `${0.5 + row.depth * 1.25}rem` };
  return (
    <li>
      {threadId === null ? (
        <div className={`${className} ${row.here ? "" : "text-muted-foreground"}`} style={style}>
          {body}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(threadId)}
          className={`${className} hover:bg-accent`}
          style={style}
        >
          {body}
        </button>
      )}
    </li>
  );
}

function Mark(props: { strong?: boolean; children: string }) {
  return (
    <span
      className={`shrink-0 rounded px-1 text-2xs ${
        props.strong ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {props.children}
    </span>
  );
}
