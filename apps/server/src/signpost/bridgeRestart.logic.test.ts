import { describe, expect, it } from "vite-plus/test";

import { afterExit, tokenChanged } from "./bridgeRestart.logic.ts";

const noToken = JSON.stringify({
  ok: false,
  error: "no-token",
  message: "no T3 token at /home/s/.config/stree/t3-token. Create one in your own terminal",
  path: "/home/s/.config/stree/t3-token",
});

describe("afterExit: what the launcher does when a bridge exits", () => {
  it("a missing token: no retry, it waits for the token file, at the path the bridge named", () => {
    expect(
      afterExit({ code: 2, stdout: `${noToken}\n`, uptimeMs: 300, previousDelayMs: 0 }),
    ).toEqual({ kind: "wait-for-token", tokenPath: "/home/s/.config/stree/t3-token" });
  });

  it("a bridge that falls again and again: the wait doubles from 1s, up to a minute", () => {
    const delays: number[] = [];
    let previousDelayMs = 0;
    for (let i = 0; i < 9; i++) {
      const d = afterExit({ code: 1, stdout: "", uptimeMs: 200, previousDelayMs });
      if (d.kind !== "retry") throw new Error("expected a retry");
      delays.push(d.delayMs);
      previousDelayMs = d.delayMs;
    }
    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000, 60_000]);
  });

  it("a bridge that ran a while before it fell starts from 1s again", () => {
    expect(afterExit({ code: 1, stdout: "", uptimeMs: 45_000, previousDelayMs: 60_000 })).toEqual({
      kind: "retry",
      delayMs: 1_000,
    });
  });

  it("killed by a signal, or stopped with exit 0, is a fall too", () => {
    expect(afterExit({ code: null, stdout: "", uptimeMs: 100, previousDelayMs: 4_000 })).toEqual({
      kind: "retry",
      delayMs: 8_000,
    });
    expect(afterExit({ code: 0, stdout: "", uptimeMs: 100, previousDelayMs: 0 })).toEqual({
      kind: "retry",
      delayMs: 1_000,
    });
  });

  it("another reason it could not start (no tree, a usage error) is retried, not taken for a missing token", () => {
    const notReady = JSON.stringify({ ok: false, error: "not-ready", message: "no tree here" });
    expect(afterExit({ code: 2, stdout: notReady, uptimeMs: 100, previousDelayMs: 0 })).toEqual({
      kind: "retry",
      delayMs: 1_000,
    });
  });

  it("no-token is believed only with exit 2, the code the bridge gives it", () => {
    expect(afterExit({ code: 1, stdout: noToken, uptimeMs: 100, previousDelayMs: 0 })).toEqual({
      kind: "retry",
      delayMs: 1_000,
    });
  });
});

describe("tokenChanged: after a missing token, when the launcher tries once more", () => {
  const at = (mtimeMs: number, size: number) => ({ mtimeMs, size });

  it("the file appeared: try", () => {
    expect(tokenChanged(null, at(5, 40))).toBe(true);
  });

  it("still no file, or the same file as when the bridge said no-token: do not", () => {
    expect(tokenChanged(null, null)).toBe(false);
    expect(tokenChanged(at(5, 0), at(5, 0))).toBe(false);
  });

  it("the file was written again (an empty file filled in): try", () => {
    expect(tokenChanged(at(5, 0), at(9, 40))).toBe(true);
  });

  it("the file was removed: do not", () => {
    expect(tokenChanged(at(5, 0), null)).toBe(false);
  });
});
