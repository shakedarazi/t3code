# Handoff: closing the tree-in-sidebar work, and T3 capability questions

Next session: finish the items under **Next**, and answer T3 capability questions from upstream's current docs first
(`git fetch upstream`, then `git show upstream/main:docs/README.md`), code second. Shaked reads Hebrew; product words stay
Hebrew (גזע, סשן חופשי, סשן פנימי, סשן האצלה). This page is untracked on purpose: the repo's rule is not to commit work
artifacts, so it is the only copy.

## State (checked 2026-10-31)

- `shaked` = `10620c49fa`, one ahead of `origin/shaked` (`46d630ced0`, not pushed), on `upstream/main` `15fe283272`, zero behind. Ledger: `FORK.md`.
- The tree draws in the sidebar's project-folder view (setting `boringSidebarEnabled`), web and desktop: depth indent, a
  grey line to the parent, a dot. Roots are flat (a thread without a parent in the list). Code: `components/sidebar/`
  (`threadTree.ts`, `SidebarThreadTreeMark.tsx`, `useRunningSubagentCount.ts`) plus a few lines in `Sidebar.tsx` and
  `SidebarThreadRow.tsx`.
- Server: `thread.create` takes `launchedFrom`; `t3_thread_launch` and `create_threads` set `lineage.parentThreadId`
  from the launching thread, `relationshipToParent` stays null. Verified on real Haiku turns for both, including a
  launch with a title and no message (that case was a bug in the first DMG, fixed in `10620c49fa`).
- Panel patches (Settings closes the sidebar, sidebar open state and width, `t3code://new?project=`) are gone from
  `shaked`; the four commits are the tag `panel-patches-archive` (pushed).
- Built: the 19:27 DMG (`0.1.7-preview.20261031.1927`) is installed and lacks the no-message fix; a newer DMG in
  `release/` carries it. Not launched by an agent. Installing replaces
  `/Applications/T3 Code (Beta).app` and shares its data, so Shaked installs it.
- Skill `upstream-check` (user-invoked, read-only, agnostic) is in `~/Developer/agent-skills`, pushed.

## Next

1. **Install the newest DMG and look.** Then: turn on the folder view, open a session-tree thread that an agent
   launched, confirm it nests under its launcher. The inner-session line (a short line off the dot while subagents run)
   has never been seen on screen: no subagent ran in any test. Shaked's test prompts 1 and 2 (launch, create_threads)
   nested correctly; prompt 3 (grandchild) exposed the no-message bug; 4, 6, 7 (subagent, flat root, Settle) are untried.
2. **session-tree repo before it goes** (`~/Developer/session-tree`, separate repo, other sessions write there; its ADRs
   were renumbered while this session ran, so re-read it first).
   - The lossless module copy `~/Developer/lossless/content/modules/steering/model/` is a different lineage: 13 ADRs
     with other names, an older glossary, older `check_live*.py`. Sorting means choosing per file; produce a
     file → destination list and let Shaked approve it before anything moves. `lossless` has its own remote.
   - Keep `src/` (`fold.ts`, `next.ts`, the `stree` CLI): the bridge and Settled depend on it. Only the panel
     (`panel/StreePanel.swift`, `src/cli/panel.ts`, the `t3code://new` test in `test/cli.test.ts`, glossary and
     handoff lines about the panel) is for archiving. ADR and glossary edits are Shaked's decisions: propose, do not write.
   - `docs/research-desktop-for-agents.md` there is another session's and untracked: leave it.
3. **Launch-parent patch.** Stays a fork patch (ledger row: drop when upstream records a parent for launched threads).
   Raising it upstream is Shaked's call; no PR unless asked.

## Debts carried

- `launchedFrom` is "server only" by comment, not enforced; a client's `thread.create` can send it.
- `ThreadRelationshipsControl` labels any parent that is not a subagent as "Fork", so a launched child reads "Fork".
- Threads created before the change stay flat. Backfill from the first message's `senderThreadId` is possible and
  deliberately not done (a migration in T3's core).
- Untested: scheduled tasks, `t3 thread start`, Codex and other providers, mobile (no tree there).
- The trunk is not drawn. Idea parked: display-only rule, the root with the most descendants is the trunk, childless
  roots hang under it. Shaked chose flat roots first.
- `docs/user/` on upstream was not read in the last upstream check, only commit titles.

## Gotchas

- Machine hooks block `git branch -D`, `git reset --hard`, `git push --force` and any Bash command that names
  `AGENTS.md`; read that file with the Read tool. Editing a skill needs Shaked to write "מאשר עריכה".
- `vp run dev` in a worktree seeds its `.t3` from the real database read-only; stop dev servers by the PID that owns the
  port, confirmed by its cwd, never by name.
- Branch `proto/tree-in-sidebar` and its worktree remain, bound to the old conversation; Shaked deletes the branch
  after archiving that conversation.

## Suggested skills

`upstream-check` for any "where does upstream stand" question; `domain-modeling` before touching a glossary or ADR;
`prototype` for the next throwaway; `grilling` if the trunk rule is reopened.
