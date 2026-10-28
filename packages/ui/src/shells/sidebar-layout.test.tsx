import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SidebarLayout } from "./sidebar-layout.tsx";

// jsdom has no `matchMedia`, which the drawer's motion reads. Stub it so
// the tree can mount.
beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});

function renderShell(
  props?: Partial<
    Extract<ComponentProps<typeof SidebarLayout>, { mobileSidebar?: "drawer" }>
  >,
) {
  return render(
    <SidebarLayout
      sidebar={<a href="/somewhere">Rail</a>}
      menuLabel="Menu"
      closeLabel="Close menu"
      {...props}
    >
      Body
    </SidebarLayout>,
  );
}

describe("SidebarLayout drawer", () => {
  it("opens as a dialog from the menu button and closes from the close button", async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toContainElement(screen.getByText("Rail"));

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when a link inside the drawer is followed", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByText("Rail"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
