import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "#src/test-utils.tsx";
import { ThemeSwitch } from "./theme-switch";

const LABELS: [string, string, string] = [
  "Switch to light",
  "Switch to dark",
  "Use system theme",
];

// jsdom gaps used by the nested Switch / Button press-handlers hook and by
// useMediaQuery's `window.matchMedia` call.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  if (!window.matchMedia) {
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
  }
});

beforeEach(() => {
  // Start each test without a persisted theme so the component reads
  // `"system"` by default (the storage path the hook relies on).
  localStorage.removeItem("theme");
});

function renderThemeSwitch() {
  const { container } = render(<ThemeSwitch labels={LABELS} />);
  // The component's root is the container div that owns the focus/blur/
  // mouseleave handlers and the showSystemButton class.
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("Expected ThemeSwitch to render a single root element");
  }
  return root;
}

describe("ThemeSwitch keyboard reveal", () => {
  it("does not show the system button by default", () => {
    // Seed an explicit light theme so we're on the "reveal is gated" path
    // (the system-theme branch applies `hideSystemButton`, which is the
    // unrelated code path).
    localStorage.setItem("theme", "light");
    const root = renderThemeSwitch();

    expect(root.className).not.toContain("showSystemButton");
  });

  it("reveals the system button when keyboard focus enters the container", () => {
    localStorage.setItem("theme", "light");
    const root = renderThemeSwitch();

    expect(root.className).not.toContain("showSystemButton");

    fireEvent.focus(screen.getByRole("switch"));

    expect(root.className).toContain("showSystemButton");
  });

  it("keeps the system button visible when the mouse leaves while focus stays inside", () => {
    localStorage.setItem("theme", "light");
    const root = renderThemeSwitch();

    fireEvent.focus(screen.getByRole("switch"));
    expect(root.className).toContain("showSystemButton");

    // This is the regression assertion. Before the fix, `onMouseLeave` on
    // the container cleared `hasFocus` → removed `showSystemButton` →
    // keyboard user silently lost the reveal. After the fix the handler is
    // gone and the class must stay applied because focus is still inside.
    fireEvent.mouseLeave(root);
    expect(root.className).toContain("showSystemButton");
  });

  it("hides the system button again when focus leaves the container entirely", () => {
    localStorage.setItem("theme", "light");
    const root = renderThemeSwitch();

    const switchControl = screen.getByRole("switch");
    fireEvent.focus(switchControl);
    expect(root.className).toContain("showSystemButton");

    // Simulate focus leaving to an element OUTSIDE the container. React's
    // synthetic `onBlur` receives `relatedTarget` via the event object,
    // which fireEvent.blur lets us set explicitly.
    fireEvent.blur(switchControl, { relatedTarget: document.body });
    expect(root.className).not.toContain("showSystemButton");
  });

  it("preserves the reveal when focus moves between children of the container", () => {
    // This pins the existing `containerRef.current?.contains(relatedTarget)`
    // guard — tabbing from the Switch into the System button must NOT
    // collapse the reveal, otherwise the user can never reach the button
    // they're trying to focus.
    localStorage.setItem("theme", "light");
    const root = renderThemeSwitch();

    const switchControl = screen.getByRole("switch");
    const systemButton = screen.getByRole("radio", {
      name: "Use system theme",
    });

    fireEvent.focus(switchControl);
    expect(root.className).toContain("showSystemButton");

    fireEvent.blur(switchControl, { relatedTarget: systemButton });
    // relatedTarget is still inside the container, so the blur should be a
    // no-op for `hasFocus`.
    expect(root.className).toContain("showSystemButton");
  });
});
