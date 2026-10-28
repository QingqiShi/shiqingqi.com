import { render as renderWithoutProviders } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { act } from "#src/testing/test-utils.tsx";
import { getDocumentClassName } from "./global-styles.ts";
import { resetTheme } from "./testing/reset-theme.ts";
import { ThemeApplier } from "./theme-applier.tsx";
import { themeHack } from "./theme-hack.ts";

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
