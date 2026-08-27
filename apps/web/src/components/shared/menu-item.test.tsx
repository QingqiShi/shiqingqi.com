import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "#src/test-utils.tsx";
import { MenuItem } from "./menu-item";

describe("MenuItem", () => {
  it("renders as a menuitem with the auto-focus data attribute", () => {
    render(
      <MenuItem href="/x" autoFocus>
        Focusable item
      </MenuItem>,
    );

    const item = screen.getByRole("menuitem", { name: "Focusable item" });
    expect(item).toHaveAttribute("data-menu-autofocus", "true");
  });

  it("omits the data attribute when autoFocus is false", () => {
    render(<MenuItem href="/x">Plain item</MenuItem>);

    const item = screen.getByRole("menuitem", { name: "Plain item" });
    expect(item).not.toHaveAttribute("data-menu-autofocus");
  });

  it("takes the active item out of the tab order", () => {
    render(
      <MenuItem href="/x" isActive>
        Active item
      </MenuItem>,
    );

    const item = screen.getByRole("menuitem", { name: "Active item" });
    expect(item).toHaveAttribute("tabindex", "-1");
  });

  it("marks the active item with aria-current='true'", () => {
    render(
      <MenuItem href="/x" isActive>
        Active item
      </MenuItem>,
    );

    const item = screen.getByRole("menuitem", { name: "Active item" });
    expect(item).toHaveAttribute("aria-current", "true");
  });

  it("does not mark an inactive item with aria-current", () => {
    render(<MenuItem href="/x">Inactive item</MenuItem>);

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
      <MenuItem href="/zh" lang="zh" ariaLabel="切换至中文">
        中文
      </MenuItem>,
    );

    const item = screen.getByRole("menuitem", { name: "切换至中文" });
    expect(item).toHaveAttribute("lang", "zh");
  });

  it("omits the lang attribute when none is provided", () => {
    render(<MenuItem href="/x">Default-language item</MenuItem>);

    const item = screen.getByRole("menuitem", {
      name: "Default-language item",
    });
    expect(item).not.toHaveAttribute("lang");
  });

  it("is a link the browser follows, and runs onClick without cancelling it", () => {
    // jsdom cannot observe the navigation itself, so the href and the
    // un-prevented default action are the ceiling for this layer.
    const onClick = vi.fn();
    render(
      <MenuItem href="/zh" onClick={onClick}>
        Switch to Chinese
      </MenuItem>,
    );

    const item = screen.getByRole("menuitem", { name: "Switch to Chinese" });
    expect(item).toHaveAttribute("href", "/zh");

    const notPrevented = fireEvent.click(item);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(true);
  });
});
