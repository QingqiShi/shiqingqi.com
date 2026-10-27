import { render as renderWithoutProviders } from "@testing-library/react";
import { gray } from "@tuja/ui/palette/gray.stylex";
import { renderToString } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FINANCE_LIGHT_CANVAS } from "#src/finance/theme/finance-theme.ts";
import { act, fireEvent, render, screen } from "#src/testing/test-utils.tsx";
import { getDocumentClassName } from "./global-styles.ts";
import { resetTheme } from "./testing/reset-theme.ts";
import { ThemeApplier } from "./theme-applier.tsx";
import { themeHack } from "./theme-hack.ts";
import { ThemeSwitch } from "./theme-switch.tsx";

const LABELS: [string, string] = ["Switch to light", "Switch to dark"];

// jsdom gaps used by the Button press-handlers hook.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  document.head.innerHTML = "";
  document.documentElement.className = "";
  resetTheme();
});

function runThemeHack() {
  const script = document.createElement("script");
  script.textContent = themeHack;
  document.head.appendChild(script);
}

function themeColorContents() {
  return [...document.querySelectorAll("meta[name=theme-color]")].map((meta) =>
    meta.getAttribute("content"),
  );
}

describe("ThemeApplier hydration", () => {
  it("never applies the system theme class while hydrating with a stored light theme", async () => {
    localStorage.setItem("theme", "light");
    runThemeHack();
    expect(document.documentElement.className).toBe(
      getDocumentClassName("light"),
    );

    const element = <ThemeApplier />;
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

describe("ThemeApplier", () => {
  it("replaces the pre-paint theme color with its own", () => {
    localStorage.setItem("theme", "dark");
    runThemeHack();
    expect(themeColorContents()).toEqual([gray._0]);

    render(<ThemeApplier />);

    expect(document.documentElement.className).toBe(
      getDocumentClassName("dark"),
    );
    expect(themeColorContents()).toEqual([gray._0]);
    expect(document.querySelector("[data-pre-paint-theme-color]")).toBeNull();
  });

  it("follows the Theme written by another tab", () => {
    localStorage.setItem("theme", "light");
    render(<ThemeApplier />);
    expect(themeColorContents()).toEqual([gray._97]);

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

    expect(document.documentElement.className).toBe(
      getDocumentClassName("dark"),
    );
    expect(themeColorContents()).toEqual([gray._0]);
  });

  it("follows a ThemeSwitch press when localStorage.setItem throws", () => {
    // Safari private mode / lockdown / quota-exceeded all surface as a
    // throw from setItem.
    localStorage.setItem("theme", "dark");
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

    try {
      render(
        <>
          <ThemeApplier />
          <ThemeSwitch labels={LABELS} />
        </>,
      );

      // The system Theme is light, so the press from dark goes back to
      // "system".
      fireEvent.click(screen.getByRole("button"));

      expect(document.documentElement.className).toBe(
        getDocumentClassName("system"),
      );
      expect(themeColorContents()).toEqual([gray._97]);
    } finally {
      setItemSpy.mockRestore();
    }
  });
});

describe("themeHack on a Finance page", () => {
  it("adds the Finance theme before the first paint", () => {
    localStorage.setItem("theme", "dark");
    window.history.pushState(null, "", "/zh/finance/settings");
    try {
      runThemeHack();
      expect(document.documentElement.className).toBe(
        getDocumentClassName("dark", "/finance"),
      );
      expect(document.documentElement.className).not.toBe(
        getDocumentClassName("dark"),
      );
    } finally {
      window.history.pushState(null, "", "/");
    }
  });

  it("tints the browser chrome with the island on a phone and the canvas elsewhere", () => {
    localStorage.setItem("theme", "light");
    window.history.pushState(null, "", "/finance");
    try {
      runThemeHack();
      expect(themeColorContents()).toEqual([gray._98, FINANCE_LIGHT_CANVAS]);
      expect(
        [...document.querySelectorAll("meta[name=theme-color]")].map((meta) =>
          meta.getAttribute("media"),
        ),
      ).toEqual(["(width < 768px)", null]);
    } finally {
      window.history.pushState(null, "", "/");
    }
  });
});
