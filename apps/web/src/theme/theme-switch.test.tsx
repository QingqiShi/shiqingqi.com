import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "#src/testing/test-utils.tsx";
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

function renderThemeSwitch() {
  render(<ThemeSwitch labels={LABELS} />);
}

describe("ThemeSwitch cross-tab sync", () => {
  it("re-renders with the theme written by another tab via a storage event", () => {
    localStorage.setItem("theme", "light");
    renderThemeSwitch();

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-label", "Switch to dark");

    // Simulate another tab writing "dark" to the same localStorage key.
    // jsdom doesn't fire `storage` on same-tab writes, which mirrors real
    // browser behaviour — we have to dispatch the event explicitly.
    act(() => {
      localStorage.setItem("theme", "dark");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "theme",
          newValue: "dark",
          oldValue: "light",
          storageArea: localStorage,
        }),
      );
    });

    // The aria-label flips to "Switch to light" only if `useTheme` re-emitted,
    // which only happens if the storage listener updated the singleton and
    // notified subscribers.
    expect(toggle).toHaveAttribute("aria-label", "Switch to light");
  });

  it("ignores storage events for unrelated keys", () => {
    localStorage.setItem("theme", "light");
    renderThemeSwitch();

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-label", "Switch to dark");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-other-key",
          newValue: "dark",
          oldValue: null,
          storageArea: localStorage,
        }),
      );
    });

    // Unrelated keys must not thrash subscribers.
    expect(toggle).toHaveAttribute("aria-label", "Switch to dark");
  });
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
      renderThemeSwitch();

      fireEvent.click(screen.getByRole("button"));

      // The component subscribes via useSyncExternalStore, so the label
      // only flips if `setTheme` still fires its listeners after the throw.
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Switch to light",
      );
      expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

// A fresh mock each call, rather than a captured-and-restored reference:
// `window.matchMedia` here is a plain `vi.fn()`, not a spy on a real
// browser method, and `vi.spyOn` on that returns the same mock rather than
// a restorable wrapper.
function setSystemPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: prefersDark,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

describe("ThemeSwitch press semantics", () => {
  it("stores dark on the first press when nothing is stored and the system Theme is light", () => {
    renderThemeSwitch();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    fireEvent.click(screen.getByRole("button"));

    expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    setItemSpy.mockRestore();
  });

  it("stores system, not light, when a dark Preference is pressed under a light system Theme", () => {
    localStorage.setItem("theme", "dark");
    renderThemeSwitch();

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    fireEvent.click(screen.getByRole("button"));

    // The press targets light, which is what the system Theme already
    // shows, so the store clears back to "system" instead of pinning
    // "light".
    expect(setItemSpy).toHaveBeenCalledWith("theme", "system");
    expect(setItemSpy).not.toHaveBeenCalledWith("theme", "light");
    setItemSpy.mockRestore();
  });

  it("stores light when a dark Preference is pressed under a dark system Theme", () => {
    setSystemPrefersDark(true);
    try {
      localStorage.setItem("theme", "dark");
      renderThemeSwitch();

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      fireEvent.click(screen.getByRole("button"));

      expect(setItemSpy).toHaveBeenCalledWith("theme", "light");
      setItemSpy.mockRestore();
    } finally {
      setSystemPrefersDark(false);
    }
  });

  it("writes nothing to localStorage when the stored Preference already equals the system Theme", () => {
    setSystemPrefersDark(true);
    try {
      localStorage.setItem("theme", "dark");

      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      renderThemeSwitch();

      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();
    } finally {
      setSystemPrefersDark(false);
    }
  });
});
