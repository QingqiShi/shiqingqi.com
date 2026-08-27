import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MenuButton } from "./menu-button.tsx";

// jsdom has no `matchMedia`, which the open/close morph reads for a
// reduced-motion preference. Stub it so the menu can open.
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

  it("blurs the page around the popup only while the menu is open", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestMenu />);

    // The blur layers carry their backdrop-filter as inline custom properties
    // (StyleX dynamic styles), so their presence is observable even in jsdom.
    // How many there are and where each one sits on the ramp is
    // ProgressiveBlur's own claim, covered by its suite — this only asserts
    // that the menu blurs the page while it is open, and not before.
    const blurs = () =>
      [...container.querySelectorAll('[style*="backdropFilter"]')].map(
        (layer) => layer.getAttribute("style") ?? "",
      );

    expect(blurs().length).toBeGreaterThan(0);
    for (const blur of blurs()) {
      expect(blur).toContain("blur(0px)");
    }

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(blurs().some((blur) => !blur.includes("blur(0px)"))).toBe(true);
  });

  it("locks page scroll only while the menu is open", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TestMenu />);

    // `react-remove-scroll` marks the locked document with this attribute and
    // hangs its `overflow: hidden` rule off it, so the attribute is the lock
    // rather than a proxy for it.
    expect(document.body).not.toHaveAttribute("data-scroll-locked");

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(document.body).toHaveAttribute("data-scroll-locked");

    // Unmounting rather than dismissing: it runs the same release, and the
    // assertion then holds for every close path rather than for one of them.
    unmount();

    expect(document.body).not.toHaveAttribute("data-scroll-locked");
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
