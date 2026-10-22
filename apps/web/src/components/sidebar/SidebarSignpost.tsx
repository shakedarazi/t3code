// signpost: one fixed row at the foot of the sidebar that says where to go and why (fork, see FORK.md). It reads
// `stree view` for the project of the current thread; session-tree decides, this only shows it. Quiet on purpose: no
// sound, no flash, no animation.
import { scopeProjectRef } from "@t3tools/client-runtime/environment";

import { useThreadRouteRef } from "../../hooks/useThreadRouteTarget";
import { useProject, useThreadShell } from "../../state/entities";
import { signpostRow } from "./signpost.logic";
import { SignpostMap } from "./SignpostMap";
import { useSignpost, type SignpostWhere } from "./useSignpost";

export function SidebarSignpost() {
  const current = useThreadRouteRef();
  const shell = useThreadShell(current);
  const project = useProject(
    current && shell ? scopeProjectRef(current.environmentId, shell.projectId) : null,
  );
  if (!current || !project?.workspaceRoot) return null;
  const where = {
    environmentId: current.environmentId,
    cwd: project.workspaceRoot,
    currentThreadId: current.threadId,
  };
  return (
    <div className="flex min-w-0 items-center" dir="rtl">
      <div className="min-w-0 flex-1">
        <SignpostForProject {...where} />
      </div>
      <SignpostMap {...where} />
    </div>
  );
}

function SignpostForProject(props: SignpostWhere) {
  const { loaded, answer, titleOf, open } = useSignpost(props);
  if (!loaded) return null;
  const row = signpostRow({ result: answer, titleOf, currentThreadId: props.currentThreadId });
  if (row.kind === "hidden") return null;

  const threadId = row.kind === "row" ? row.threadId : null;
  const className =
    "block w-full truncate rounded-md px-2 py-1.5 text-start text-xs text-muted-foreground";
  return threadId === null ? (
    <div dir="rtl" role="status" className={className}>
      {row.text}
    </div>
  ) : (
    <button
      type="button"
      dir="rtl"
      onClick={() => open(threadId)}
      className={`${className} hover:bg-accent hover:text-foreground`}
    >
      {row.text}
    </button>
  );
}
