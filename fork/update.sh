#!/usr/bin/env bash
# Bring the fork up to date with upstream:
#   fetch upstream, move main to upstream/main, rebase shaked onto it,
#   then typecheck and unit-test apps/web.
# Stops on a conflict that rerere cannot resolve, or on a failed check.
# The pre-update tip is kept as the tag shaked-before-update.
set -euo pipefail

cd "$(dirname "$0")/.."
source fork/lib.sh

branch=shaked
checks_only=false
[[ ${1:-} == --checks-only ]] && checks_only=true

if [[ $(git branch --show-current) != "$branch" ]]; then
  echo "switch to '$branch' first" >&2
  exit 1
fi
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "working tree has uncommitted changes" >&2
  exit 1
fi

if ! $checks_only; then
  git config rerere.enabled true
  git config rerere.autoupdate true

  git fetch upstream --tags --prune
  git branch -f main upstream/main
  git tag -f shaked-before-update "$branch" >/dev/null

  echo "rebasing $branch onto upstream/main ($(git rev-list --count "$branch"..upstream/main) new upstream commits)"
  if ! git rebase upstream/main; then
    # rerere may have resolved everything already; keep going while it does.
    while [[ -d .git/rebase-merge || -d .git/rebase-apply ]]; do
      if [[ -n $(git diff --name-only --diff-filter=U) ]]; then
        echo >&2
        echo "conflict rerere could not resolve:" >&2
        git diff --name-only --diff-filter=U >&2
        echo >&2
        echo "resolve, 'git add', then 'git rebase --continue' and run fork/update.sh --checks-only" >&2
        echo "or give up: git rebase --abort (shaked stays at shaked-before-update)" >&2
        exit 1
      fi
      git add -u
      if git diff --cached --quiet; then
        # The commit became empty: upstream already has it. Drop it.
        git rebase --skip || true
      else
        GIT_EDITOR=true git rebase --continue || true
      fi
    done
  fi
fi

git log --oneline upstream/main.."$branch"

pnpm install --frozen-lockfile
pnpm exec vp run --filter @t3tools/web typecheck
pnpm --filter @t3tools/web exec vp test run --project unit

echo "up to date. build with fork/build.sh"
