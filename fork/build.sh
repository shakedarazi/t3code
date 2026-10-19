#!/usr/bin/env bash
# Build a local macOS arm64 DMG of this fork.
#
# The version is "<upstream>-preview.YYYYMMDD.HHMM". build-desktop-artifact.ts
# packages preview versions without an update feed (isDesktopPreviewVersion),
# so upstream auto-update never replaces this build.
set -euo pipefail

cd "$(dirname "$0")/.."
source fork/lib.sh

missing=()
for tool in cargo cc make node; do
  command -v "$tool" >/dev/null || missing+=("$tool")
done
if ((${#missing[@]})); then
  echo "missing build tools: ${missing[*]}" >&2
  exit 1
fi

# Latest upstream tag, e.g. v0.1.1-nightly.20261019.3373 -> 0.1.1
base=$(git describe --tags --abbrev=0 --match 'v[0-9]*' upstream/main 2>/dev/null ||
  git describe --tags --abbrev=0 --match 'v[0-9]*')
base=${base#v}
base=${base%%-*}
# semver drops leading zeros, so 0153 becomes 153
version="${base}-preview.$(date +%Y%m%d).$((10#$(date +%H%M)))"

echo "building T3 Code ${version} (arm64 dmg)"
pnpm install --frozen-lockfile
T3CODE_DESKTOP_VERSION="$version" pnpm dist:desktop:dmg:arm64

ls -1 "release/T3-Code-${version}-arm64.dmg"
