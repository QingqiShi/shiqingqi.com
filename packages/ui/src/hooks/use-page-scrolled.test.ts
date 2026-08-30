import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePageScrolled } from "./use-page-scrolled.ts";

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

describe("usePageScrolled", () => {
  it("reports the page at rest while it sits at the top", () => {
    const { result } = renderHook(() => usePageScrolled());

    expect(result.current.isScrolled).toBe(false);
  });

  it("reports the page scrolled once it leaves the top", () => {
    const { result } = renderHook(() => usePageScrolled());

    scrollThePage(240);
    expect(result.current.isScrolled).toBe(true);

    scrollThePage(0);
    expect(result.current.isScrolled).toBe(false);
  });

  it("matches a scroll position restored before it mounts", () => {
    setPageScroll(600);
    const { result } = renderHook(() => usePageScrolled());

    expect(result.current.isScrolled).toBe(true);
  });

  it("holds the page at rest for a sub-pixel offset", () => {
    const { result } = renderHook(() => usePageScrolled());

    scrollThePage(0.4);
    expect(result.current.isScrolled).toBe(false);
  });

  it("listens passively, so it never delays the scroll it watches", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePageScrolled());

    expect(addSpy).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    addSpy.mockRestore();
  });

  it("removes the scroll listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePageScrolled());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    removeSpy.mockRestore();
  });
});
