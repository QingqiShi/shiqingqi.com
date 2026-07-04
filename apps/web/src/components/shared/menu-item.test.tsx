import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { MenuItem } from "./menu-item";

// MenuItem calls useRouter() at render time, which requires the Next.js App
// Router context. These tests only assert rendered attributes (they never
// navigate), so a no-op router stub is enough to let the component mount.
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
});
