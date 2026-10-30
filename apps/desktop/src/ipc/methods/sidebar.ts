import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as DesktopEnvironment from "../../app/DesktopEnvironment.ts";
import * as IpcChannels from "../channels.ts";
import * as DesktopIpc from "../DesktopIpc.ts";

/**
 * fork: the sidebar's open state, written to `<state dir>/sidebar-open` as `true` or `false` on every change, for
 * session-tree's panel, which opens and closes with it. A write that fails is dropped: the next change writes again.
 */
export const setOpen = DesktopIpc.makeIpcMethod({
  channel: IpcChannels.SIDEBAR_OPEN_CHANNEL,
  payload: Schema.Boolean,
  result: Schema.Void,
  handler: Effect.fn("desktop.ipc.sidebar.setOpen")(function* (open) {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* fileSystem
      .writeFileString(path.join(environment.stateDir, "sidebar-open"), String(open))
      .pipe(Effect.ignore);
  }),
});
