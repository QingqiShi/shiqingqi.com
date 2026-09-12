import { render as renderWithoutProviders } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getDocumentClassName } from "#src/app/global-styles.ts";
import { act, fireEvent, render, screen } from "#src/test-utils.tsx";
import { themeHack } from "#src/utils/theme-hack.ts";
import { ThemeSwitch } from "./theme-switch";

const LABELS: [string, string] = ["Switch to light", "Switch to dark"];

// jsdom gaps used by the Button press-handlers hook and by useMediaQuery's
// `window.matchMedia` call.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  setSystemPrefersDark(false);
});

beforeEach(() => {
  // Start each test without a persisted theme so the component reads
  // `"system"` by default (the storage path the hook relies on).
  localStorage.removeItem("theme");
});

function renderThemeSwitch() {
  render(<ThemeSwitch labels={LABELS} />);
}

// Hydration only, so it renders without the shared providers: the server
// string and the client tree must match exactly. It seeds localStorage but
// never calls `setTheme`, thus the module-level `themeSingleton` in
// `use-theme.ts` stays untouched and the ordering below is safe.
describe("ThemeSwitch hydration", () => {
  it("never applies the system theme class while hydrating with a stored light theme", async () => {
    // Run the real inline script: it must put the stored theme on <html>
    // before React starts, exactly as in the browser.
    localStorage.setItem("theme", "light");
    document.documentElement.className = "";
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- `themeHack` is a script string, which only an eval can run
    new Function(themeHack)();
    expect(document.documentElement.className).toBe(
      getDocumentClassName("light"),
    );

    const element = <ThemeSwitch labels={LABELS} />;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);

    // Each record holds the value that the write replaced.
    const replacedClassNames: (string | null)[] = [];
    const observer = new MutationObserver((records) => {
      replacedClassNames.push(...records.map((record) => record.oldValue));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });

    renderWithoutProviders(element, { container, hydrate: true });
    // MutationObserver callbacks are microtasks; flush them.
    await act(async () => {});
    observer.disconnect();

    // `useTheme` returns its server snapshot ("system") during the hydration
    // pass, so before the fix the layout effect stamped the system class.
    expect(replacedClassNames).not.toHaveLength(0);
    expect(replacedClassNames).not.toContain(getDocumentClassName("system"));
    expect(document.documentElement.className).toBe(
      getDocumentClassName("light"),
    );
  });
});

// Placed near the end because the dispatched `storage` event mutates the
// module-level `themeSingleton` in `use-theme.ts`. The final assertion
// leaves it set to "light" so the resilience block below can still start
// from a light theme.
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
    expect(document.documentElement.className).toBe(
      getDocumentClassName("dark"),
    );

    // Reset to "light" (both storage and singleton) so the resilience test
    // below starts from the theme it expects.
    act(() => {
      localStorage.setItem("theme", "light");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "theme",
          newValue: "light",
          oldValue: "dark",
          storageArea: localStorage,
        }),
      );
    });
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

// Placed after the blocks above because it presses the button, which updates the module-level `themeSingleton` in `use-theme.ts`, and
// this block has no reset hook of its own. The "press semantics" group below
// resets the singleton itself, so it can safely run after this one.
describe("ThemeSwitch localStorage resilience", () => {
  it("still reflects the new theme on <html> when localStorage.setItem throws", () => {
    // Safari private mode / lockdown / quota-exceeded all surface as a
    // throw from setItem. Before the fix, the throw short-circuited the
    // subscriber notification inside `setTheme`, so useLayoutEffect in
    // ThemeSwitch never re-ran and toggling produced no visible change.
    localStorage.setItem("theme", "light");
    const originalClassName = document.documentElement.className;

    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

    try {
      renderThemeSwitch();

      fireEvent.click(screen.getByRole("button"));

      // The class name must have changed in response to the toggle — the
      // component subscribes via useSyncExternalStore, so this only
      // flips if `setTheme` still fires its listeners after the throw.
      expect(document.documentElement.className).not.toBe(originalClassName);
      expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

// A fresh mock each call, rather than a captured-and-restored reference:
// `window.matchMedia` here is a plain `vi.fn()`, not a spy on a real
// browser method, and `vi.spyOn` on that returns the same mock rather than
// a restorable wrapper. Hoisted, so `beforeAll` above can call it.
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
  // `useTheme`'s snapshot prefers the in-memory `themeSingleton` in
  // `use-theme.ts` over localStorage once a prior test has set it, and only
  // a dispatched "storage" event clears it back. Mount and unmount a throwaway
  // instance to force that clear, so each test below can seed its starting
  // Preference with a plain `localStorage.setItem`/`removeItem` and know a
  // fresh render will actually read it.
  beforeEach(() => {
    const { unmount } = render(<ThemeSwitch labels={LABELS} />);
    act(() => {
      localStorage.removeItem("theme");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "theme",
          newValue: null,
          oldValue: null,
          storageArea: localStorage,
        }),
      );
    });
    unmount();
  });

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
