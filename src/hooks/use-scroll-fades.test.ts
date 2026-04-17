import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { useScrollFades } from "./use-scroll-fades";

function makeScrollable({
  scrollLeft = 0,
  scrollWidth = 500,
  clientWidth = 200,
}: {
  scrollLeft?: number;
  scrollWidth?: number;
  clientWidth?: number;
} = {}) {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollLeft", {
    get: () => scrollLeft,
    configurable: true,
  });
  Object.defineProperty(el, "scrollWidth", {
    get: () => scrollWidth,
    configurable: true,
  });
  Object.defineProperty(el, "clientWidth", {
    get: () => clientWidth,
    configurable: true,
  });
  return el;
}

function redefineScroll(
  el: HTMLElement,
  props: {
    scrollLeft?: number;
    scrollWidth?: number;
    clientWidth?: number;
  },
) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(el, key, {
      get: () => value,
      configurable: true,
    });
  }
}

describe("useScrollFades", () => {
  let rafSpy: MockInstance;

  beforeEach(() => {
    // jsdom doesn't have ResizeObserver, so the hook uses rAF fallback.
    // Make rAF invoke the callback synchronously for test simplicity.
    rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        cb(0);
        return 0;
      });
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  it("returns both fades false when ref is null", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      return useScrollFades(ref);
    });
    expect(result.current.showLeftFade).toBe(false);
    expect(result.current.showRightFade).toBe(false);
  });

  it("shows right fade when content overflows and scroll is at start", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollFades(ref));

    expect(result.current.showLeftFade).toBe(false);
    expect(result.current.showRightFade).toBe(true);
  });

  it("shows both fades when scrolled to the middle", () => {
    const el = makeScrollable({
      scrollLeft: 100,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollFades(ref));

    expect(result.current.showLeftFade).toBe(true);
    expect(result.current.showRightFade).toBe(true);
  });

  it("shows only left fade when scrolled to the end (within 1px tolerance)", () => {
    // scrollLeft 299 + clientWidth 200 = 499 = scrollWidth 500 - 1
    const el = makeScrollable({
      scrollLeft: 299,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollFades(ref));

    expect(result.current.showLeftFade).toBe(true);
    expect(result.current.showRightFade).toBe(false);
  });

  it("shows no fades when content fits without scrolling", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 200,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollFades(ref));

    expect(result.current.showLeftFade).toBe(false);
    expect(result.current.showRightFade).toBe(false);
  });

  it("updates fades on scroll events", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollFades(ref));

    expect(result.current.showLeftFade).toBe(false);
    expect(result.current.showRightFade).toBe(true);

    // Simulate scrolling to the end
    redefineScroll(el, { scrollLeft: 300 });
    act(() => {
      el.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.showLeftFade).toBe(true);
    expect(result.current.showRightFade).toBe(false);
  });

  it("removes scroll listener on unmount", () => {
    const el = makeScrollable();
    const removeSpy = vi.spyOn(el, "removeEventListener");
    const ref = { current: el };
    const { unmount } = renderHook(() => useScrollFades(ref));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("remeasures when children change content width without container resize", async () => {
    class StubResizeObserver implements ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const originalRO = window.ResizeObserver;
    window.ResizeObserver = StubResizeObserver;

    try {
      // Start with content that fits — no fades.
      const el = makeScrollable({
        scrollLeft: 0,
        scrollWidth: 200,
        clientWidth: 200,
      });
      const ref = { current: el };
      const { result } = renderHook(() => useScrollFades(ref));

      expect(result.current.showLeftFade).toBe(false);
      expect(result.current.showRightFade).toBe(false);

      // Simulate a child being added: scrollWidth grows past clientWidth,
      // but the container's own box size is unchanged.
      redefineScroll(el, { scrollWidth: 500 });
      const child = document.createElement("div");
      await act(async () => {
        el.appendChild(child);
        // MutationObserver callbacks are microtasks; flush them.
        await Promise.resolve();
      });

      expect(result.current.showRightFade).toBe(true);
    } finally {
      window.ResizeObserver = originalRO;
    }
  });
});
