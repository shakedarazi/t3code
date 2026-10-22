// signpost: what the row and the map share (fork, see FORK.md): one `stree view` query per project, the sidebar's own
// thread titles, and the sidebar's own navigation.
import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useRouter } from "@tanstack/react-router";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/reactivity";

import { useThreadShells } from "../../state/entities";
import { streeView } from "../../state/signpost";
import { buildThreadRouteParams } from "../../threadRoutes";

export interface SignpostWhere {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly currentThreadId: ThreadId;
}

export function useSignpost({ environmentId, cwd }: SignpostWhere) {
  const result = useAtomValue(streeView({ environmentId, input: { cwd } }));
  const threads = useThreadShells();
  const router = useRouter();

  const titleOf = (threadId: string) =>
    threads.find((t) => t.environmentId === environmentId && t.id === threadId)?.title ?? null;
  const open = (threadId: string) =>
    void router.navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(environmentId, threadId as ThreadId)),
    });

  return {
    /** Before the first answer there is nothing to say, so a project without a tree never flashes a row. */
    loaded: result._tag !== "Initial",
    /** null when the read failed. */
    answer: result._tag === "Failure" ? null : Option.getOrNull(AsyncResult.value(result)),
    titleOf,
    open,
  };
}
