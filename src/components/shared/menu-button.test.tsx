import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MenuButton } from "./menu-button";
import { MenuItem } from "./menu-item";

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

// MenuItem calls useRouter() at render time, which requires the Next.js
// App Router context. The keyboard-navigation tests don't exercise routing,
// so a no-op router stub is enough to let the component mount.
const stubRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

function RouterProvider({ children }: { children: ReactNode }) {
  return <AppRouterContext value={stubRouter}>{children}</AppRouterContext>;
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
          <MenuItem href="/a" autoFocus={autoFocusIndex === 0}>
            Item A
          </MenuItem>
          <MenuItem href="/b" autoFocus={autoFocusIndex === 1}>
            Item B
          </MenuItem>
          <MenuItem href="/c" autoFocus={autoFocusIndex === 2}>
            Item C
          </MenuItem>
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
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const items = getMenuItems();
    expect(items[0]).toHaveFocus();
  });

  it("moves focus to the item marked as autoFocus when the menu opens", async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider>
        <TestMenu autoFocusIndex={1} />
      </RouterProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const items = getMenuItems();
    expect(items[1]).toHaveFocus();
  });

  it("cycles focus forward with ArrowDown", async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

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
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

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
    render(
      <RouterProvider>
        <TestMenu autoFocusIndex={1} />
      </RouterProvider>,
    );

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
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Open menu" });
    await user.click(trigger);
    expect(getMenuItems()[0]).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("marks the popup as inert when the menu is closed", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

    // Before opening, the popup container should be inert so keyboard
    // users cannot tab into invisible menu items.
    const inertEl = container.querySelector("[inert]");
    expect(inertEl).not.toBeNull();

    // After opening, the popup should no longer be inert.
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(container.querySelector("[inert]")).toBeNull();
  });

  it("ties the trigger to the popup via aria-controls while closed", () => {
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

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
    render(
      <RouterProvider>
        <TestMenu />
      </RouterProvider>,
    );

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

describe("MenuItem", () => {
  it("renders as a menuitem with the auto-focus data attribute", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x" autoFocus>
          Focusable item
        </MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "Focusable item" });
    expect(item).toHaveAttribute("data-menu-autofocus", "true");
  });

  it("omits the data attribute when autoFocus is false", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x">Plain item</MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "Plain item" });
    expect(item).not.toHaveAttribute("data-menu-autofocus");
  });

  it("takes the active item out of the tab order", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x" isActive>
          Active item
        </MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "Active item" });
    expect(item).toHaveAttribute("tabindex", "-1");
  });

  it("marks the active item with aria-current='true'", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x" isActive>
          Active item
        </MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "Active item" });
    expect(item).toHaveAttribute("aria-current", "true");
  });

  it("does not mark an inactive item with aria-current", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x">Inactive item</MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "Inactive item" });
    expect(item).not.toHaveAttribute("aria-current");
  });

  it("forwards the lang attribute to the underlying anchor", () => {
    // WCAG 3.1.2 (Language of Parts): when the item's visible text and
    // aria-label are in a different language from the surrounding page,
    // the `lang` attribute must appear on an ancestor of the text (here,
    // the anchor itself) so screen readers switch pronunciation rules.
    // This is the load-bearing fix for the locale-switcher menu — see
    // `LocaleSelector`.
    render(
      <RouterProvider>
        <MenuItem href="/zh" lang="zh" ariaLabel="切换至中文">
          中文
        </MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", { name: "切换至中文" });
    expect(item).toHaveAttribute("lang", "zh");
  });

  it("omits the lang attribute when none is provided", () => {
    render(
      <RouterProvider>
        <MenuItem href="/x">Default-language item</MenuItem>
      </RouterProvider>,
    );

    const item = screen.getByRole("menuitem", {
      name: "Default-language item",
    });
    expect(item).not.toHaveAttribute("lang");
  });
});
