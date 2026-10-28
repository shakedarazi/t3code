// Fork (session-tree): every show of a thread is a `thread.visit` with `shown`, and the server stamps `shownAt`. The
// watermark cannot say it: a read thread moves nothing, and opens are deduped. A notification, the sidebar and a link all
// end in the thread route, which mounts this beside the visit tracker.
import type { EnvironmentId, ScopedThreadRef, ThreadId } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

import { parseThreadKey, threadKey } from "./entities.ts";
import { type AtomCommand, runAtomCommand } from "./runtime.ts";
import type { VisitThreadInput } from "./threadCommands.ts";

const IDLE: Atom.Atom<void> = Atom.make(undefined).pipe(
  Atom.withLabel("thread-shown-reporter:idle"),
);

interface ShownShell {
  readonly environmentId: EnvironmentId;
  readonly id: ThreadId;
  readonly updatedAt: string;
  readonly lastVisitedAt?: string | null | undefined;
}

export interface ThreadShownReporterOptions {
  readonly threadShellAtom: (ref: ScopedThreadRef) => Atom.Atom<ShownShell | null>;
  readonly visit: AtomCommand<
    { readonly environmentId: EnvironmentId; readonly input: VisitThreadInput },
    unknown,
    unknown
  >;
}

/** While mounted, the thread is shown: mounting tells the server once, as soon as its shell is there. */
export function createThreadShownReporter(options: ThreadShownReporterOptions) {
  const family = Atom.family((key: string) => {
    const ref = parseThreadKey(key);
    return Atom.make((get) => {
      const registry = get.registry;
      let pending = true;
      get.subscribe(
        options.threadShellAtom(ref),
        (shell) => {
          // A server without visit tracking leaves lastVisitedAt undefined: it has no shownAt either.
          if (!pending || shell === null || shell.lastVisitedAt === undefined) return;
          pending = false;
          void runAtomCommand(
            registry,
            options.visit,
            {
              environmentId: shell.environmentId,
              // The command needs a time; a show never moves the watermark (the server reads `shown`), so the
              // watermark where it is, or the last update of a thread never visited, which stays unread.
              input: {
                threadId: shell.id,
                visitedAt: shell.lastVisitedAt ?? shell.updatedAt,
                shown: true,
              },
            },
            { reportFailure: false },
          );
        },
        { immediate: true },
      );
    }).pipe(Atom.withLabel(`thread-shown-reporter:${key}`));
  });
  return (ref: ScopedThreadRef | null) => (ref === null ? IDLE : family(threadKey(ref)));
}
