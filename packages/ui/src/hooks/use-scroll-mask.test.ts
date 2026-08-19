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
import { useScrollMask } from "./use-scroll-mask.ts";

// Sets every scroll dimension on the element so the same stub works for either
// orientation; the hook only reads the axis it's told to.
function makeScrollable({
  scrollLeft = 0,
  scrollWidth = 500,
  clientWidth = 200,
  scrollTop = 0,
  scrollHeight = 500,
  clientHeight = 200,
}: {
  scrollLeft?: number;
  scrollWidth?: number;
  clientWidth?: number;
  scrollTop?: number;
  scrollHeight?: number;
  clientHeight?: number;
} = {}) {
  const el = document.createElement("div");
  const dims = {
    scrollLeft,
    scrollWidth,
    clientWidth,
    scrollTop,
    scrollHeight,
    clientHeight,
  };
  for (const [key, value] of Object.entries(dims)) {
    Object.defineProperty(el, key, { get: () => value, configurable: true });
  }
  return el;
}

function redefineScroll(el: HTMLElement, props: Record<string, number>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(el, key, { get: () => value, configurable: true });
  }
}

describe("useScrollMask", () => {
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

  it("returns both edges false when ref is null", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLElement>(null);
      return useScrollMask(ref);
    });
    expect(result.current.showStartMask).toBe(false);
    expect(result.current.showEndMask).toBe(false);
  });

  it("masks the end edge when content overflows and scroll is at the start", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollMask(ref));

    expect(result.current.showStartMask).toBe(false);
    expect(result.current.showEndMask).toBe(true);
  });

  it("masks both edges when scrolled to the middle", () => {
    const el = makeScrollable({
      scrollLeft: 100,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollMask(ref));

    expect(result.current.showStartMask).toBe(true);
    expect(result.current.showEndMask).toBe(true);
  });

  it("masks only the start edge when scrolled to the end (within 1px tolerance)", () => {
    // scrollLeft 299 + clientWidth 200 = 499 = scrollWidth 500 - 1
    const el = makeScrollable({
      scrollLeft: 299,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollMask(ref));

    expect(result.current.showStartMask).toBe(true);
    expect(result.current.showEndMask).toBe(false);
  });

  it("masks no edge when content fits without scrolling", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 200,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollMask(ref));

    expect(result.current.showStartMask).toBe(false);
    expect(result.current.showEndMask).toBe(false);
  });

  it("reads the vertical axis when orientation is vertical", () => {
    // At the top: no start (top) mask, but content below → end (bottom) mask.
    const atTop = makeScrollable({
      scrollTop: 0,
      scrollHeight: 900,
      clientHeight: 300,
    });
    const { result: top } = renderHook(() =>
      useScrollMask({ current: atTop }, "vertical"),
    );
    expect(top.current.showStartMask).toBe(false);
    expect(top.current.showEndMask).toBe(true);

    // Scrolled down the middle: both edges mask.
    const middle = makeScrollable({
      scrollTop: 200,
      scrollHeight: 900,
      clientHeight: 300,
    });
    const { result: mid } = renderHook(() =>
      useScrollMask({ current: middle }, "vertical"),
    );
    expect(mid.current.showStartMask).toBe(true);
    expect(mid.current.showEndMask).toBe(true);
  });

  it("updates both edges on scroll events", () => {
    const el = makeScrollable({
      scrollLeft: 0,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const ref = { current: el };
    const { result } = renderHook(() => useScrollMask(ref));

    expect(result.current.showStartMask).toBe(false);
    expect(result.current.showEndMask).toBe(true);

    // Simulate scrolling to the end
    redefineScroll(el, { scrollLeft: 300 });
    act(() => {
      el.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.showStartMask).toBe(true);
    expect(result.current.showEndMask).toBe(false);
  });

  it("stays inert and attaches no scroll listener when disabled", () => {
    const el = makeScrollable({
      scrollLeft: 100,
      scrollWidth: 500,
      clientWidth: 200,
    });
    const addSpy = vi.spyOn(el, "addEventListener");
    const ref = { current: el };
    const { result } = renderHook(() =>
      useScrollMask(ref, "horizontal", { enabled: false }),
    );

    // Would mask both edges if enabled; disabled leaves them false and never
    // wires up the scroll observer.
    expect(result.current.showStartMask).toBe(false);
    expect(result.current.showEndMask).toBe(false);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("removes scroll listener on unmount", () => {
    const el = makeScrollable();
    const removeSpy = vi.spyOn(el, "removeEventListener");
    const ref = { current: el };
    const { unmount } = renderHook(() => useScrollMask(ref));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("remeasures when children change content size without container resize", async () => {
    class StubResizeObserver implements ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const originalRO = window.ResizeObserver;
    window.ResizeObserver = StubResizeObserver;

    try {
      // Start with content that fits — no masks.
      const el = makeScrollable({
        scrollLeft: 0,
        scrollWidth: 200,
        clientWidth: 200,
      });
      const ref = { current: el };
      const { result } = renderHook(() => useScrollMask(ref));

      expect(result.current.showStartMask).toBe(false);
      expect(result.current.showEndMask).toBe(false);

      // Simulate a child being added: scrollWidth grows past clientWidth,
      // but the container's own box size is unchanged.
      redefineScroll(el, { scrollWidth: 500 });
      const child = document.createElement("div");
      await act(async () => {
        el.appendChild(child);
        // MutationObserver callbacks are microtasks; flush them.
        await Promise.resolve();
      });

      expect(result.current.showEndMask).toBe(true);
    } finally {
      window.ResizeObserver = originalRO;
    }
  });
});
