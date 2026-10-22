// signpost: the session-tree signpost in the sidebar (fork, see FORK.md). The server runs `stree view --json` in the
// project's folder and decodes what it printed; session-tree decides everything, the web only shows it.
import * as Schema from "effect/Schema";
import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export const StreeViewInput = Schema.Struct({
  /** `stree` finds the log from here, through git's common dir. */
  cwd: TrimmedNonEmptyString,
});
export type StreeViewInput = typeof StreeViewInput.Type;

export const StreeWhy = Schema.Literals([
  "your-turn",
  "waiting-for-you",
  "result-back",
  "with-agents",
]);
export type StreeWhy = typeof StreeWhy.Type;

export const StreeWaiting = Schema.Literals(["question", "conflict", "result"]);
export type StreeWaiting = typeof StreeWaiting.Type;

export const StreeTurn = Schema.Literals(["you", "agent"]);
export type StreeTurn = typeof StreeTurn.Type;

export const StreeMapNode = Schema.Struct({
  id: Schema.String,
  parent: Schema.NullOr(Schema.String),
  depth: Schema.Number,
  mode: Schema.Literals(["sync", "async"]),
  state: Schema.Literals(["open", "active", "blocked_on_you", "done", "joined", "cancelled"]),
  turn: Schema.NullOr(StreeTurn),
  subtrunk: Schema.Boolean,
  waiting: Schema.NullOr(StreeWaiting),
  target: Schema.Boolean,
  goal: Schema.NullOr(Schema.String),
  /** The thread a click opens: an inner session opens its parent's. */
  thread: Schema.NullOr(Schema.String),
});
export type StreeMapNode = typeof StreeMapNode.Type;

/** What `stree view --json` prints. Without a tree that is the whole answer. */
export const StreeViewData = Schema.Union([
  Schema.Struct({ tree: Schema.Literal(false) }),
  Schema.Struct({
    tree: Schema.Literal(true),
    /** Unbound: the bridge has not run here yet, so no node has a thread. */
    bridge: Schema.Struct({ bound: Schema.Boolean }),
    signpost: Schema.Struct({
      why: StreeWhy,
      node: Schema.NullOr(Schema.String),
      thread: Schema.NullOr(Schema.String),
    }),
    map: Schema.Struct({
      cursor: Schema.Struct({
        node: Schema.NullOr(Schema.String),
        thread: Schema.NullOr(Schema.String),
      }),
      nodes: Schema.Array(StreeMapNode),
    }),
  }),
]);
export type StreeViewData = typeof StreeViewData.Type;

/** The `stree bridge` T3 runs for the repo. `no-token`: it cannot start until the person makes the token. */
export const BridgeLauncherState = Schema.Literals(["running", "restarting", "no-token"]);
export type BridgeLauncherState = typeof BridgeLauncherState.Type;

/** What `stree view` said, and when it has a tree, how its bridge is. */
export const StreeViewRan = Schema.Struct({
  view: StreeViewData,
  /** Absent when there is no tree, or the folder is not in a git repo. */
  launcher: Schema.optional(BridgeLauncherState),
});
export type StreeViewRan = typeof StreeViewRan.Type;

/** `stree` is not on the PATH the server sees: not installed, which is not the same as no tree. No bridge is started. */
export const StreeMissing = Schema.Struct({ stree: Schema.Literal("missing") });
export type StreeMissing = typeof StreeMissing.Type;

export const StreeViewResult = Schema.Union([StreeMissing, StreeViewRan]);
export type StreeViewResult = typeof StreeViewResult.Type;

export const isStreeMissing = (result: StreeViewResult): result is StreeMissing =>
  "stree" in result;

export class StreeViewError extends Schema.TaggedError<StreeViewError>()("StreeViewError", {
  cwd: Schema.String,
  detail: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {
  override get message(): string {
    return `stree view failed in ${this.cwd}: ${this.detail}`;
  }
}
