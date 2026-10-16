import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readVisibleArea, useVisibleArea } from "./use-visible-area.ts";

describe("readVisibleArea", () => {
  it("is the bottom of the visual viewport in the document", () => {
    expect(
      readVisibleArea({ height: 800, pageTop: 1000, scale: 1 }, 0),
    ).toEqual({ bottom: 1800, height: 800 });
  });

  it("stops at the top of the keyboard", () => {
    expect(
      readVisibleArea({ height: 500, pageTop: 1000, scale: 1 }, 0),
    ).toEqual({ bottom: 1500, height: 500 });
  });

  it("goes past the end of the document when iOS scrolls the visual viewport there", () => {
    // A 5332px document, scrolled to its end at 4557, and a visual viewport
    // that iOS scrolled 412px further to show a focused field.
    expect(
      readVisibleArea({ height: 426, pageTop: 4969, scale: 1 }, 0),
    ).toEqual({ bottom: 5395, height: 426 });
  });

  it("is measured from the top of the containing block", () => {
    expect(readVisibleArea({ height: 800, pageTop: 0, scale: 1 }, 24)).toEqual({
      bottom: 776,
      height: 800,
    });
  });

  it("is null while the page is zoomed", () => {
    expect(
      readVisibleArea({ height: 400, pageTop: 1000, scale: 2 }, 0),
    ).toBeNull();
  });
});

class FakeVisualViewport extends EventTarget {
  height = 800;
  pageTop = 0;
  scale = 1;
  move(height: number, pageTop = 0, scale = 1) {
    this.height = height;
    this.pageTop = pageTop;
    this.scale = scale;
    this.dispatchEvent(new Event("resize"));
  }
}

function Box({ onRender }: { onRender: () => void }) {
  onRender();
  const ref = useVisibleArea();
  return <div data-testid="box" ref={ref} />;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

describe("useVisibleArea", () => {
  let viewport: FakeVisualViewport;

  beforeEach(() => {
    viewport = new FakeVisualViewport();
    vi.stubGlobal("visualViewport", viewport);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes the visible area to the element in the next frame, and renders nothing for it", async () => {
    const onRender = vi.fn();
    const { getByTestId } = render(<Box onRender={onRender} />);
    const box = getByTestId("box");
    expect(box.style.getPropertyValue("--visible-bottom")).toBe("800px");
    expect(box.style.getPropertyValue("--visible-height")).toBe("800px");

    viewport.move(500, 1200);
    await nextFrame();
    expect(box.style.getPropertyValue("--visible-bottom")).toBe("1700px");
    expect(box.style.getPropertyValue("--visible-height")).toBe("500px");
    expect(onRender).toHaveBeenCalledOnce();
  });

  it("keeps the last values while the page is zoomed", async () => {
    const { getByTestId } = render(<Box onRender={vi.fn()} />);
    const box = getByTestId("box");

    viewport.move(400, 300, 2);
    await nextFrame();

    expect(box.style.getPropertyValue("--visible-bottom")).toBe("800px");
    expect(box.style.getPropertyValue("--visible-height")).toBe("800px");
  });

  it("stops listening, and removes what it wrote, when the element goes", () => {
    const { getByTestId, unmount } = render(<Box onRender={vi.fn()} />);
    const box = getByTestId("box");
    const removed = vi.spyOn(viewport, "removeEventListener");

    unmount();

    expect(removed).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removed).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(box.style.getPropertyValue("--visible-bottom")).toBe("");
  });
});
