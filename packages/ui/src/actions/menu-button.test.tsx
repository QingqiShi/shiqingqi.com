import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
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

function TestMenu({ autoFocusIndex }: { autoFocusIndex?: number }) {
  return (
    <MenuButton
      buttonProps={{ type: "button", "aria-label": "Open menu" }}
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

    // The backdrop is a non-focusable overlay rendered inside the
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
});

describe("MenuButton controlled open state", () => {
  // A trigger, plus one control inside the popup that closes the menu from the
  // parent — the shape the Lab's bar uses.
  function ControlledMenu({
    onOpenChange,
  }: {
    onOpenChange: (open: boolean) => void;
  }) {
    const [open, setOpen] = useState(false);
    return (
      <MenuButton
        buttonProps={{ type: "button", "aria-label": "Open menu" }}
        popupRole="group"
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
        menuContent={
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
          >
            Pick
          </button>
        }
      />
    );
  }

  it("hands focus back to the trigger when the parent closes it", async () => {
    const user = userEvent.setup();
    render(<ControlledMenu onOpenChange={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Pick" }));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
