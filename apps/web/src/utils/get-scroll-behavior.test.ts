import { describe, it, expect, vi, afterEach } from "vitest";
import { getScrollBehavior } from "./get-scroll-behavior";

describe("getScrollBehavior", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns "smooth" when user has no motion preference', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    expect(getScrollBehavior()).toBe("smooth");
  });

  it('returns "instant" when user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getScrollBehavior()).toBe("instant");
  });

  it("queries the correct media query", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    getScrollBehavior();

    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });
});
