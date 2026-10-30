import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { parseNewThreadLink, parseProjectThreadLink } from "@t3tools/shared/promptLinks";
import { useAtomValue } from "@effect/atom-react";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { NewThreadLinkView } from "../components/promptLinks/NewThreadLinkView";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { SidebarInset } from "../components/ui/sidebar";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useProjects } from "../state/entities";
import { allReachableShellsLiveAtom } from "../state/shell";

function LinkError({ message }: { readonly message: string }) {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <Empty className="flex-1">
        <EmptyHeader className="max-w-md">
          <EmptyTitle>Could not open the link</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </SidebarInset>
  );
}

// fork: a new thread in a project, empty, once the projects are known (session-tree's panel, a project with no thread).
function ProjectThreadLink({ project }: { readonly project: string }) {
  const ready = useAtomValue(allReachableShellsLiveAtom);
  const projects = useProjects();
  const openThread = useNewThreadHandler();
  const [failed, setFailed] = useState<string | null>(null);
  const startedRef = useRef(false);
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    const found = projects.find((p) => p.id === project);
    if (found === undefined) {
      setFailed("This link names a project T3 Code does not have.");
      return;
    }
    void openThread(scopeProjectRef(found.environmentId, found.id), { replace: true })
      .catch(() => null)
      .then((opened) => {
        if (opened === null) setFailed("T3 Code could not open a new thread.");
      });
  }, [ready, projects, project, openThread]);
  return failed === null ? null : <LinkError message={failed} />;
}

// The query is read raw: the router's own search parsing turns `prompt=123` into a number.
function NewThreadLinkRoute() {
  const search = useLocation({ select: (location) => location.searchStr });
  const project = parseProjectThreadLink(search);
  if (project !== null) return <ProjectThreadLink key={search} project={project} />;
  const parsed = parseNewThreadLink(search);
  if (!parsed.ok) return <LinkError message={parsed.error} />;
  return <NewThreadLinkView key={search} link={parsed.value} />;
}

export const Route = createFileRoute("/_chat/new")({
  component: NewThreadLinkRoute,
});
