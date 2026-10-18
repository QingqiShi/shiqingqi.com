import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualViewport } from "./use-visual-viewport.ts";

class FakeVisualViewport extends EventTarget {
  height = 800;
  pageTop = 0;
  scale = 1;
  move({
    height = this.height,
    pageTop = this.pageTop,
    scale = this.scale,
  }: Partial<Pick<FakeVisualViewport, "height" | "pageTop" | "scale">>) {
    this.height = height;
    this.pageTop = pageTop;
    this.scale = scale;
    act(() => {
      this.dispatchEvent(new Event("resize"));
    });
  }
}

describe("useVisualViewport", () => {
  let viewport: FakeVisualViewport;

  beforeEach(() => {
    viewport = new FakeVisualViewport();
    vi.stubGlobal("visualViewport", viewport);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is the visual viewport, from the top of the document", () => {
    viewport.pageTop = 1000;
    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ top: 1000, height: 800 });
  });

  it("stops at the top of the keyboard", () => {
    const { result } = renderHook(() => useVisualViewport());

    viewport.move({ height: 500, pageTop: 1200 });

    expect(result.current).toEqual({ top: 1200, height: 500 });
  });

  it("goes past the end of the document when iOS scrolls the visual viewport there", () => {
    const { result } = renderHook(() => useVisualViewport());

    // A 5332px document, scrolled to its end at 4557, and a visual viewport
    // that iOS scrolled 412px further to show a focused field.
    viewport.move({ height: 426, pageTop: 4969 });

    expect(result.current).toEqual({ top: 4969, height: 426 });
  });

  it("renders again only when a whole px changes", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useVisualViewport();
    });
    const before = renders;

    viewport.move({ height: 800.2 });
    expect(renders).toBe(before);

    viewport.move({ height: 790 });
    expect(renders).toBe(before + 1);
  });

  it("keeps the last area while the page is zoomed", () => {
    const { result } = renderHook(() => useVisualViewport());

    viewport.move({ height: 400, pageTop: 300, scale: 2 });

    expect(result.current).toEqual({ top: 0, height: 800 });
  });

  it("takes the layout viewport on a page zoomed before it starts", () => {
    viewport.move({ height: 400, pageTop: 300, scale: 2 });
    vi.stubGlobal("innerHeight", 700);
    vi.stubGlobal("scrollY", 50);

    const { result } = renderHook(() => useVisualViewport());

    expect(result.current).toEqual({ top: 50, height: 700 });
  });

  it("stops listening when the last reader goes", () => {
    const { unmount } = renderHook(() => useVisualViewport());
    const removed = vi.spyOn(viewport, "removeEventListener");

    unmount();

    expect(removed).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removed).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
