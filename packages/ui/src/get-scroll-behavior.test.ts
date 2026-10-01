import { afterEach, describe, expect, it, vi } from "vitest";
import { getScrollBehavior } from "./get-scroll-behavior.ts";

describe("getScrollBehavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns "smooth" when user has no motion preference', () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    expect(getScrollBehavior()).toBe("smooth");
  });

  it('returns "instant" when user prefers reduced motion', () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    expect(getScrollBehavior()).toBe("instant");
  });

  it("queries the correct media query", () => {
    const matchMediaMock = vi.fn().mockReturnValue({ matches: false });
    vi.stubGlobal("matchMedia", matchMediaMock);

    getScrollBehavior();

    expect(matchMediaMock).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });
});
