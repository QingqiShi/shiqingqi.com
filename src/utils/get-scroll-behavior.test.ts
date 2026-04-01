import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getScrollBehavior } from "./get-scroll-behavior";

describe("getScrollBehavior", () => {
  let matchMediaSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaSpy = vi.fn();
    window.matchMedia = matchMediaSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'smooth' when user has no motion preference", () => {
    matchMediaSpy.mockReturnValue({ matches: false });

    expect(getScrollBehavior()).toBe("smooth");
    expect(matchMediaSpy).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });

  it("returns 'instant' when user prefers reduced motion", () => {
    matchMediaSpy.mockReturnValue({ matches: true });

    expect(getScrollBehavior()).toBe("instant");
    expect(matchMediaSpy).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)",
    );
  });
});
