import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePageScrollMask } from "./use-page-scroll-mask.ts";

// jsdom lays nothing out and never scrolls, so the page's offset is stubbed on
// the window the same way the element hook's tests stub `scrollTop`.
function setPageScroll(scrollY: number) {
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
  });
}

function scrollThePage(scrollY: number) {
  setPageScroll(scrollY);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

afterEach(() => {
  setPageScroll(0);
});

describe("usePageScrollMask", () => {
  it("carries no mask while the page rests at the top", () => {
    const { result } = renderHook(() => usePageScrollMask());

    expect(result.current.showStartMask).toBe(false);
  });

  it("masks the start edge once the page scrolls away from the top", () => {
    const { result } = renderHook(() => usePageScrollMask());

    scrollThePage(240);
    expect(result.current.showStartMask).toBe(true);

    scrollThePage(0);
    expect(result.current.showStartMask).toBe(false);
  });

  it("matches a scroll position restored before it mounts", () => {
    setPageScroll(600);
    const { result } = renderHook(() => usePageScrollMask());

    expect(result.current.showStartMask).toBe(true);
  });

  it("holds the mask off for a sub-pixel offset", () => {
    const { result } = renderHook(() => usePageScrollMask());

    scrollThePage(0.4);
    expect(result.current.showStartMask).toBe(false);
  });

  it("listens passively, so it never delays the scroll it watches", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePageScrollMask());

    expect(addSpy).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    addSpy.mockRestore();
  });

  it("removes the scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePageScrollMask());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });
});
