import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useViewportHeight } from "./use-viewport-height";

describe("useViewportHeight", () => {
  it("returns the current window.innerHeight", () => {
    const { result } = renderHook(() => useViewportHeight());
    expect(result.current).toBe(window.innerHeight);
  });

  it("updates when the window is resized", () => {
    const { result } = renderHook(() => useViewportHeight());
    const initial = result.current;

    act(() => {
      // jsdom doesn't actually change innerHeight on resize events,
      // but we can override it to simulate a resize.
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: initial + 200,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(initial + 200);
  });
});
