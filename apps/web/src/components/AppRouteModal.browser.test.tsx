import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { act, render } from "../../test/render";
import { useCommitOnBlur } from "../hooks/useCommitOnBlur";
import { AppRouteModal } from "./AppRouteModal";
import { SidebarProvider, useSidebar } from "./ui/sidebar";

function CommitOnBlurField({ onCommit }: { onCommit: (next: string) => void }) {
  return <input aria-label="Instructions" {...useCommitOnBlur("", onCommit)} />;
}

describe("AppRouteModal", () => {
  it("commits a focused field when Esc closes it", async () => {
    const onCommit = vi.fn();
    await using _screen = await render(
      <AppRouteModal label="Settings">
        <CommitOnBlurField onCommit={onCommit} />
      </AppRouteModal>,
      { router: "/settings/general" },
    );

    await page.getByRole("textbox", { name: "Instructions" }).fill("Keep titles short");
    await userEvent.keyboard("{Escape}");

    expect(onCommit).toHaveBeenCalledWith("Keep titles short");
  });
});

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
