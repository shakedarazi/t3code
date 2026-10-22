// signpost: when T3 starts `stree bridge` again after it exits (fork, see FORK.md). Pure, so
// the policy is tested apart from the processes. The bridge says why it could not start in its --json error.

/** A run this long was not a crash loop: the next fall starts from the base delay again. */
const BRIDGE_STABLE_UPTIME_MS = 30_000;
const BRIDGE_RESTART_BASE_MS = 1_000;
const BRIDGE_RESTART_MAX_MS = 60_000;

export type RestartDecision =
  /** Start it again after delayMs. */
  | { readonly kind: "retry"; readonly delayMs: number }
  /** No token: the person's step. Not retried until the token file changes. Its content is never read. */
  | { readonly kind: "wait-for-token"; readonly tokenPath: string | null };

function bridgeError(stdout: string): { error?: unknown; path?: unknown } | null {
  for (const line of stdout.split("\n")) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed !== null && typeof parsed === "object") return parsed as { error?: unknown };
    } catch {
      // not the bridge's JSON line
    }
  }
  return null;
}

export function afterExit(input: {
  /** The bridge's exit code; null when it did not start or was killed by a signal. */
  readonly code: number | null;
  /** What the bridge printed on stdout: only its --json error, if it had one. */
  readonly stdout: string;
  readonly uptimeMs: number;
  /** The delay before the start that just ended; 0 for the first start. */
  readonly previousDelayMs: number;
}): RestartDecision {
  const error = input.code === 2 ? bridgeError(input.stdout) : null;
  if (error?.error === "no-token")
    return {
      kind: "wait-for-token",
      tokenPath: typeof error.path === "string" ? error.path : null,
    };
  const delayMs =
    input.previousDelayMs === 0 || input.uptimeMs >= BRIDGE_STABLE_UPTIME_MS
      ? BRIDGE_RESTART_BASE_MS
      : Math.min(input.previousDelayMs * 2, BRIDGE_RESTART_MAX_MS);
  return { kind: "retry", delayMs };
}

/** What the launcher knows of the token file: that it exists, when it was written, and its size. Never its content. */
export type TokenStamp = { readonly mtimeMs: number; readonly size: number } | null;

/** After no-token, try once more only when the file is there and is not the one the bridge already refused. */
export function tokenChanged(atExit: TokenStamp, now: TokenStamp): boolean {
  if (now === null) return false;
  return atExit === null || atExit.mtimeMs !== now.mtimeMs || atExit.size !== now.size;
}
