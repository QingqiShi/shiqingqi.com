import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "#src/test-utils.tsx";
import { MenuItem } from "./menu-item";

// MenuItem calls useRouter() at render time, which requires the Next.js App
// Router context. A no-op router stub is enough: the attribute tests never
// navigate, and the click tests only assert which router methods were called.
const stubRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  bfcacheId: "stub-bfcache-id",
};

function RouterProvider({ children }: { children: ReactNode }) {
  return <AppRouterContext value={stubRouter}>{children}</AppRouterContext>;
}

describe("MenuItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    // aria-label are in a different language from the surrounding page, the
    // `lang` attribute must appear on an ancestor of the text (here, the anchor
    // itself) so screen readers switch pronunciation rules. This is the
    // load-bearing fix for the locale-switcher menu — see `LocaleSelector`.
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

  it("navigates via router.push on click", async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider>
        <MenuItem href="/zh">Switch to Chinese</MenuItem>
      </RouterProvider>,
    );

    await user.click(
      screen.getByRole("menuitem", { name: "Switch to Chinese" }),
    );

    expect(stubRouter.push).toHaveBeenCalledWith("/zh");
  });

  it("runs onNavigation once, after the push", async () => {
    // Covers the locale switcher's router.refresh(): it must run with the
    // navigation already issued, in the same transition. Recording the push
    // count at call time asserts the ordering without another spy.
    const pushCountWhenCalled: number[] = [];
    const user = userEvent.setup();
    render(
      <RouterProvider>
        <MenuItem
          href="/zh"
          onNavigation={() => {
            pushCountWhenCalled.push(stubRouter.push.mock.calls.length);
          }}
        >
          Switch to Chinese
        </MenuItem>
      </RouterProvider>,
    );

    await user.click(
      screen.getByRole("menuitem", { name: "Switch to Chinese" }),
    );

    expect(stubRouter.push).toHaveBeenCalledWith("/zh");
    expect(pushCountWhenCalled).toEqual([1]);
  });
});

describe("MenuItem navigation", () => {
  beforeEach(() => {
    stubRouter.push.mockClear();
  });

  it("navigates in place and prevents default on a plain click", () => {
    render(
      <RouterProvider>
        <MenuItem href="/zh">中文</MenuItem>
      </RouterProvider>,
    );

    const notPrevented = fireEvent.click(
      screen.getByRole("menuitem", { name: "中文" }),
    );

    expect(stubRouter.push).toHaveBeenCalledWith("/zh");
    // Default prevented, so the browser doesn't do a full-page navigation.
    expect(notPrevented).toBe(false);
  });

  it("lets a modifier click fall through to native navigation", () => {
    render(
      <RouterProvider>
        <MenuItem href="/zh">中文</MenuItem>
      </RouterProvider>,
    );

    const notPrevented = fireEvent.click(
      screen.getByRole("menuitem", { name: "中文" }),
      { metaKey: true },
    );

    expect(stubRouter.push).not.toHaveBeenCalled();
    // Default left intact, so the browser can open the href in a new tab.
    expect(notPrevented).toBe(true);
  });
});
