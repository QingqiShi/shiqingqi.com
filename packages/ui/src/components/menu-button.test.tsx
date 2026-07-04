import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MenuButton } from "./menu-button.tsx";

// jsdom doesn't implement these APIs used by Button's press animation hook
// or AnimateToTarget's reduced-motion check + web-animations call. Stub
// them so the component tree can mount without tripping on platform gaps.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.animate = vi.fn().mockReturnValue({
    cancel: vi.fn(),
    finish: vi.fn(),
    onfinish: null,
    oncancel: null,
  });
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

// Stands in for the app's MenuItem, which lives in app code the package can't
// import. It reproduces the two contract points MenuButton's keyboard
// navigation queries: `role="menuitem"` and the `data-menu-autofocus` marker
// that selects the item to focus first when the menu opens.
function MenuItemFixture({
  autoFocus,
  children,
}: {
  autoFocus?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-menu-autofocus={autoFocus ? "true" : undefined}
    >
      {children}
    </button>
  );
}

function TestMenu({
  autoFocusIndex,
  popupRole,
}: {
  autoFocusIndex?: number;
  popupRole?: "menu" | "group" | undefined;
}) {
  return (
    <MenuButton
      buttonProps={{ type: "button", "aria-label": "Open menu" }}
      popupRole={popupRole}
      menuContent={
        <div>
          <MenuItemFixture autoFocus={autoFocusIndex === 0}>
            Item A
          </MenuItemFixture>
          <MenuItemFixture autoFocus={autoFocusIndex === 1}>
            Item B
          </MenuItemFixture>
          <MenuItemFixture autoFocus={autoFocusIndex === 2}>
            Item C
          </MenuItemFixture>
        </div>
      }
    />
  );
}

function getMenuItems() {
  return screen.getAllByRole("menuitem");
}

describe("MenuButton keyboard navigation", () => {
  it("moves focus to the first menu item when the menu opens", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const items = getMenuItems();
    expect(items[0]).toHaveFocus();
  });

  it("moves focus to the item marked as autoFocus when the menu opens", async () => {
    const user = userEvent.setup();
    render(<TestMenu autoFocusIndex={1} />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const items = getMenuItems();
    expect(items[1]).toHaveFocus();
  });

  it("cycles focus forward with ArrowDown", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const items = getMenuItems();

    await user.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(items[2]).toHaveFocus();

    // Wraps around to the first item
    await user.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
  });

  it("cycles focus backward with ArrowUp", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const items = getMenuItems();

    // Wraps from first to last
    await user.keyboard("{ArrowUp}");
    expect(items[2]).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(items[1]).toHaveFocus();
  });

  it("jumps to first item on Home and last item on End", async () => {
    const user = userEvent.setup();
    render(<TestMenu autoFocusIndex={1} />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const items = getMenuItems();
    expect(items[1]).toHaveFocus();

    await user.keyboard("{End}");
    expect(items[2]).toHaveFocus();

    await user.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });

  it("returns focus to the trigger on Escape", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    expect(getMenuItems()[0]).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("returns focus to the trigger when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestMenu />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    expect(getMenuItems()[0]).toHaveFocus();

    // The backdrop is a non-focusable overlay rendered alongside the
    // container while the menu is open. Use fireEvent so the click lands
    // exactly on the backdrop without userEvent's focus-shifting heuristics
    // kicking in (jsdom can't model native pointer focus the same way as a
    // real browser).
    const backdrop = container.querySelector('[aria-hidden="true"]');
    if (!backdrop) throw new Error("expected backdrop");
    fireEvent.click(backdrop);

    expect(trigger).toHaveFocus();
  });

  it("marks the popup as inert when the menu is closed", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestMenu />);

    // Before opening, the popup container should be inert so keyboard
    // users cannot tab into invisible menu items.
    const inertEl = container.querySelector("[inert]");
    expect(inertEl).not.toBeNull();

    // After opening, the popup should no longer be inert.
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(container.querySelector("[inert]")).toBeNull();
  });

  it("ties the trigger to the popup via aria-controls while closed", () => {
    render(<TestMenu />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    const controlsId = trigger.getAttribute("aria-controls") ?? "";
    expect(controlsId).not.toBe("");

    // Popup is always mounted (hidden via inert), so the referenced element
    // must exist in the DOM even before the menu is opened.
    const popup = document.getElementById(controlsId);
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute("role", "menu");
  });

  it("keeps aria-controls pointing at the popup after opening", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    const controlsIdBefore = trigger.getAttribute("aria-controls") ?? "";

    await user.click(trigger);

    // Same relationship holds open — same id, same popup element.
    const controlsIdAfter = trigger.getAttribute("aria-controls") ?? "";
    expect(controlsIdAfter).toBe(controlsIdBefore);

    const popup = document.getElementById(controlsIdAfter);
    expect(popup).not.toBeNull();
    // Popup is the element carrying role=menu and the menu items.
    expect(popup).toHaveAttribute("role", "menu");
    expect(popup?.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
  });

  it("ties the trigger to the popup via aria-controls for non-menu popups too", () => {
    render(
      <MenuButton
        buttonProps={{ type: "button", "aria-label": "Open filters" }}
        popupRole="group"
        menuContent={
          <div>
            <button type="button">Filter A</button>
            <button type="button">Filter B</button>
          </div>
        }
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open filters" });
    const controlsId = trigger.getAttribute("aria-controls") ?? "";
    expect(controlsId).not.toBe("");

    const popup = document.getElementById(controlsId);
    expect(popup).not.toBeNull();
    expect(popup).toHaveAttribute("role", "group");
  });

  it("does not intercept arrow keys when popupRole is not 'menu'", async () => {
    const user = userEvent.setup();

    // Using role="group" should leave arrow keys as no-ops — the popup
    // doesn't advertise a menu contract, so MenuButton must not meddle.
    render(
      <MenuButton
        buttonProps={{ type: "button", "aria-label": "Open group" }}
        popupRole="group"
        menuContent={
          <div>
            <button type="button">First</button>
            <button type="button">Second</button>
          </div>
        }
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open group" });
    await user.click(trigger);

    // Focus stayed on the trigger — no auto-move into the popup for groups.
    expect(trigger).toHaveFocus();

    // Arrow keys should not move focus anywhere; trigger remains focused.
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveFocus();
  });
});
