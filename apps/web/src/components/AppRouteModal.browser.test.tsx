import { describe, expect, it } from "vite-plus/test";

import { act, render } from "../../test/render";
import { AppRouteModal } from "./AppRouteModal";
import { SidebarProvider, useSidebar } from "./ui/sidebar";

function SidebarState() {
  return <output data-testid="sidebar">{useSidebar().open ? "open" : "closed"}</output>;
}

// fork: Settings closes the sidebar while it is open, and opens it again after (Shaked, 2026-10-30).
describe("AppRouteModal and the sidebar", () => {
  it("closes an open sidebar while it is open, and opens it again when it goes", async () => {
    await using screen = await render(
      <SidebarProvider defaultOpen>
        <SidebarState />
        <AppRouteModal label="Settings">settings</AppRouteModal>
      </SidebarProvider>,
    );
    await expect.element(screen.getByTestId("sidebar")).toHaveTextContent("closed");
    await screen.rerender(
      <SidebarProvider defaultOpen>
        <SidebarState />
      </SidebarProvider>,
    );
    await act(() => undefined);
    await expect.element(screen.getByTestId("sidebar")).toHaveTextContent("open");
  });
});
