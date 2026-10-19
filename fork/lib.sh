# Shared by fork/*.sh. Uses a global pnpm when present, otherwise the exact
# version pinned in package.json's packageManager, through npx.
if ! command -v pnpm >/dev/null; then
  T3_PNPM_SPEC=$(node -p 'require("./package.json").packageManager')
  pnpm() { npx -y "$T3_PNPM_SPEC" "$@"; }
fi
