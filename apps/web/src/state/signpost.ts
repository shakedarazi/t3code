// signpost: `stree view` for the project of the current thread, polled every few seconds (fork, see FORK.md).
import { WS_METHODS } from "@t3tools/contracts";
import { createEnvironmentRpcQueryAtomFamily } from "@t3tools/client-runtime/state/runtime";

import { connectionAtomRuntime } from "../connection/runtime";

export const streeView = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:stree:view",
  tag: WS_METHODS.streeView,
  staleTimeMs: 0,
  refreshIntervalMs: 3_000,
  idleTtlMs: 60_000,
});
