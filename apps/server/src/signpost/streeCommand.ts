// signpost: how the server runs session-tree's `stree` (fork, see FORK.md).

/**
 * The one place the command is set. `STREE_COMMAND` (split on spaces, e.g. `bun /path/to/stree.ts`) when the server
 * sees it; otherwise `stree` on PATH. The packaged app only gets PATH from the login shell, not custom variables.
 */
export const streeCommand = (env: NodeJS.ProcessEnv = process.env): [string, ...string[]] => {
  const [command = "stree", ...rest] = (env.STREE_COMMAND ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return [command, ...rest];
};
