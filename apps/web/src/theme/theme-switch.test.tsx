import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "#src/testing/test-utils.tsx";
import { resetTheme } from "./testing/reset-theme.ts";
import { ThemeSwitch } from "./theme-switch";

const LABELS: [string, string] = ["Switch to light", "Switch to dark"];

// jsdom gaps used by the Button press-handlers hook.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  resetTheme();
});

describe("ThemeSwitch localStorage resilience", () => {
  it("still reflects the new theme when localStorage.setItem throws", () => {
    // Safari private mode / lockdown / quota-exceeded all surface as a
    // throw from setItem. Before the fix, the throw short-circuited the
    // subscriber notification inside `setTheme`, so toggling produced no
    // visible change.
    localStorage.setItem("theme", "light");

    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

    try {
      render(<ThemeSwitch labels={LABELS} />);

      fireEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Switch to light",
      );
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
