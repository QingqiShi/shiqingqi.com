import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { mount } from "../test-support/mount.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import {
  observeStuck,
  stuckDistance,
  stuckRootMargins,
  watchStuck,
} from "./observe-stuck.ts";

const SIZE = { width: 300, height: 48 };
const insets = (top: string, bottom = "auto") => ({
  top,
  right: "auto",
  bottom,
  left: "auto",
});

describe("stuckRootMargins", () => {
  it("shrinks the viewport by each sticky offset and 1px more, for the box", () => {
    expect(stuckRootMargins(insets("64px"), SIZE).box).toBe(
      "-65px 0px 0px 0px",
    );
    expect(stuckRootMargins(insets("auto", "16px"), SIZE).box).toBe(
      "0px 0px -17px 0px",
    );
  });

  it("shrinks the viewport by each sticky offset and the box's size, for the container", () => {
    expect(stuckRootMargins(insets("64px"), SIZE).container).toBe(
      "-112px 0px 0px 0px",
    );
    expect(stuckRootMargins(insets("0px", "8px"), SIZE).container).toBe(
      "-48px 0px -56px 0px",
    );
  });

  it("rounds a part of a px out, as a browser rounds a root margin", () => {
    expect(stuckRootMargins(insets("63.5px"), SIZE).box).toBe(
      "-65px 0px 0px 0px",
    );
  });

  it("counts each offset from the padding of a scroller, where a sticky box stops", () => {
    const padding = { left: 0, top: 12, right: 0, bottom: 20 };
    const margins = stuckRootMargins(insets("0px", "8px"), SIZE, padding);
    expect(margins.box).toBe("-13px 0px -29px 0px");
    expect(margins.container).toBe("-60px 0px -76px 0px");
  });

  it("watches no container for a box with no sticky offset", () => {
    expect(stuckRootMargins(insets("auto"), SIZE).container).toBeNull();
  });
});

/** A box with `inset`, laid out at `y` in the viewport. */
function stickyBar(inset: string, y: number, position = "sticky") {
  const bar = mount(
    `<div data-target style="position: ${position}; ${inset}"></div>`,
  );
  layOut(bar, { x: 0, y, ...SIZE });
  return bar;
}

const VIEWPORT = { left: 0, top: 0, right: 1024, bottom: 768 };

describe("stuckDistance", () => {
  it("is 0 while the sticky box is at its offset from the top", () => {
    expect(stuckDistance(stickyBar("top: 64px", 64), VIEWPORT)).toBe(0);
  });

  it("is the distance to the offset while the sticky box is below it, or pushed above it", () => {
    expect(stuckDistance(stickyBar("top: 64px", 300), VIEWPORT)).toBe(236);
    expect(stuckDistance(stickyBar("top: 64px", 20), VIEWPORT)).toBe(44);
  });

  it("reads an offset from the bottom of the scrollport", () => {
    expect(stuckDistance(stickyBar("bottom: 16px", 768 - 64), VIEWPORT)).toBe(
      0,
    );
    expect(stuckDistance(stickyBar("bottom: 16px", 768 + 200), VIEWPORT)).toBe(
      264,
    );
  });

  it("measures the offset from the scrollport, not from the viewport", () => {
    const scrollport = { left: 0, top: 100, right: 400, bottom: 500 };
    expect(stuckDistance(stickyBar("top: 8px", 108), scrollport)).toBe(0);
    expect(stuckDistance(stickyBar("top: 8px", 8), scrollport)).toBe(100);
  });

  it("is 0 for a fixed box at its offset, and Infinity for a box in flow", () => {
    expect(stuckDistance(stickyBar("top: 0px", 0, "fixed"), VIEWPORT)).toBe(0);
    expect(stuckDistance(stickyBar("top: 0px", 0, "static"), VIEWPORT)).toBe(
      Infinity,
    );
  });

  it("is Infinity for a sticky box with no offset", () => {
    expect(stuckDistance(stickyBar("", 0), VIEWPORT)).toBe(Infinity);
  });
});

describe("observeStuck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  function setUp() {
    const observers = stubObservers();
    const container = document.createElement("section");
    const box = document.createElement("div");
    box.style.position = "sticky";
    box.style.top = "64px";
    container.append(box);
    document.body.append(container);
    layOut(box, { x: 0, y: 200, ...SIZE });
    const onChange = vi.fn();
    const watch = observeStuck(box, onChange);
    return { observers, box, container, onChange, watch };
  }

  it("watches the box and its container, and calls nothing for the first report", () => {
    const { observers, box, container, onChange } = setUp();
    expect(observers.intersectionObservers()).toBe(2);
    observers.intersect(box);
    observers.intersect(container);
    expect(onChange).not.toHaveBeenCalled();
    observers.intersect(box);
    observers.intersect(container);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("watches again and calls for a new size of the box, and not for the size it knows", () => {
    const { observers, box, onChange } = setUp();
    observers.resize(box, SIZE.width, SIZE.height);
    expect(onChange).not.toHaveBeenCalled();
    layOut(box, { x: 0, y: 200, width: 300, height: 96 });
    observers.resize(box, 300, 96);
    expect(onChange).toHaveBeenCalledOnce();
    expect(observers.intersectionObservers()).toBe(2);
  });

  it("keeps its observers when it watches again with the same offsets and size", () => {
    const { observers, box, onChange, watch } = setUp();
    observers.intersect(box);
    watch.rearm();
    observers.intersect(box);
    expect(onChange).toHaveBeenCalledOnce();

    box.style.top = "32px";
    watch.rearm();
    observers.intersect(box);
    expect(onChange).toHaveBeenCalledOnce();
    expect(observers.intersectionObservers()).toBe(2);
  });

  it("disconnects every observer", () => {
    const { observers, box, watch } = setUp();
    watch.disconnect();
    expect(observers.intersectionObservers()).toBe(0);
    expect(observers.resizeObserversOf(box)).toBe(0);
  });
});

describe("watchStuck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  /** A box that sticks 64px from the top, laid out `y` px from the top. */
  function setUp(y: number) {
    const observers = stubObservers();
    const frames = stubFrames();
    const container = document.createElement("section");
    const box = document.createElement("div");
    box.style.position = "sticky";
    box.style.top = "64px";
    container.append(box);
    document.body.append(container);
    const moveTo = (top: number) => {
      layOut(box, { x: 0, y: top, ...SIZE });
    };
    moveTo(y);
    const changes: boolean[] = [];
    const watch = watchStuck(box, (stuck) => {
      changes.push(stuck);
    });
    const scroll = () => {
      document.dispatchEvent(new Event("scroll"));
      frames.run();
    };
    return { observers, box, container, moveTo, changes, watch, scroll };
  }

  it("reads the box when it starts, and calls only for a change", () => {
    expect(setUp(200).changes).toEqual([]);
    const { watch, changes } = setUp(64);
    expect(watch.isStuck()).toBe(true);
    expect(changes).toEqual([true]);
  });

  it("reads the box when the stuck observers signal", () => {
    const { observers, box, container, moveTo, changes, watch } = setUp(200);
    observers.intersect(box);
    observers.intersect(container);
    moveTo(64);
    observers.intersect(box);
    expect(watch.isStuck()).toBe(true);
    moveTo(40);
    observers.intersect(container);
    expect(watch.isStuck()).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it("reads the box on each scroll while it is near its offset, and not while it is far from it", () => {
    const { box, moveTo, changes, scroll } = setUp(200);
    const reads: Element[] = [];
    layOut(box, { x: 0, y: 200, ...SIZE }, reads);
    scroll();
    expect(reads).toEqual([]);

    // A scroll can stop the box between the observers' line and its offset.
    moveTo(65.5);
    window.dispatchEvent(new Event("resize"));
    expect(changes).toEqual([]);
    moveTo(64);
    scroll();
    expect(changes).toEqual([true]);
    moveTo(63.2);
    scroll();
    expect(changes).toEqual([true, false]);
  });

  it("disconnects every observer and listener", () => {
    const { observers, box, moveTo, changes, watch, scroll } = setUp(64);
    watch.disconnect();
    expect(observers.intersectionObservers()).toBe(0);
    expect(observers.resizeObserversOf(box)).toBe(0);
    moveTo(200);
    scroll();
    window.dispatchEvent(new Event("resize"));
    expect(changes).toEqual([true]);
  });
});
