import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMotionEngine } from "../motion/create-motion-engine.ts";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { layOut, layOutInColumn } from "../test-support/lay-out.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import {
  addSplitViewMark,
  createSplitViewMotion,
  type SplitViewMarks,
} from "./create-split-view-motion.ts";

let clock: ReturnType<typeof fakeMotionClock>;

beforeEach(() => {
  clock = fakeMotionClock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

const NONE = { content: null, detail: null } as const;
const IN = { content: null, detail: "in" } as const;
const OUT = { content: null, detail: "out" } as const;

function element(attributes: Record<string, string>, ...children: Element[]) {
  const node = document.createElement("div");
  for (const [name, value] of Object.entries(attributes)) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function page(role: string) {
  return element(
    { "data-split-view-page": role },
    element({ "data-split-view-dim": "" }),
    element({ "data-split-view-edge": "" }),
  );
}

function setUp() {
  const under = page("under");
  const current = page("current");
  const content = element(
    { "data-split-view-column": "content" },
    element({ "data-split-view-pages": "" }, under, current),
  );
  const view = element({}, content);
  const layer = element({});
  document.body.append(view, layer);
  layOut(view, { x: 0, y: 0, width: 800, height: 600 });
  layOut(content, { x: 0, y: 0, width: 400, height: 600 });
  const marks: SplitViewMarks = new Map();
  const events = {
    onSettled: vi.fn(),
    onFold: vi.fn(),
    onFrame: vi.fn(),
  };
  const observers = stubObservers();
  const engine = createMotionEngine();
  const motion = createSplitViewMotion(engine, view, layer, marks, events);
  /** Tells the motion that the screen shows the content column now, as after a frame. */
  const show = () => {
    observers.resize(content, 0, 0);
  };
  return {
    view,
    layer,
    content,
    under,
    current,
    marks,
    events,
    motion,
    observers,
    show,
  };
}

function translateXOf(node: HTMLElement) {
  return Number.parseFloat(
    /translateX\((-?[\d.]+)px\)/.exec(node.style.transform)?.[1] ?? "NaN",
  );
}

describe("createSplitViewMotion", () => {
  it("pushes a page in from the inline end, and lets go of its styles at rest", async () => {
    const { under, current, events, motion } = setUp();
    motion.play(null, { ...NONE, content: "push" }, 1);
    expect(translateXOf(current)).toBe(400);
    expect(current.style.visibility).toBe("hidden");
    await clock.advance(0.15);
    expect(translateXOf(current)).toBeGreaterThan(0);
    expect(translateXOf(current)).toBeLessThan(400);
    expect(translateXOf(under)).toBeLessThan(0);
    expect(events.onSettled).not.toHaveBeenCalled();
    await clock.advance(3);
    expect(current.style.transform).toBe("");
    expect(under.style.transform).toBe("");
    expect(events.onSettled).toHaveBeenCalledWith(1);
  });

  it("turns a push that a pop cuts off from where it is, at the speed it has", async () => {
    const { under, current, motion } = setUp();
    motion.play(null, { ...NONE, content: "push" }, 1);
    // On a frame, so that the page shows where the model is.
    await clock.advance(0.096);
    const before = translateXOf(current);
    current.setAttribute("data-split-view-page", "leaving");
    under.setAttribute("data-split-view-page", "current");
    motion.play(null, { ...NONE, content: "pop" }, 2);
    expect(translateXOf(current)).toBeCloseTo(before, 0);
    await clock.advance(0.016);
    expect(translateXOf(current)).toBeLessThan(before);
    await clock.advance(3);
    expect(current.style.transform).toBe("");
  });

  it("holds a screen swiped away until the view pops it", async () => {
    const { current, events, motion } = setUp();
    expect(motion.beginSwipe()).toBe(true);
    motion.drag(0.5);
    expect(translateXOf(current)).toBe(200);
    motion.release(true, -2);
    await clock.advance(2);
    expect(translateXOf(current)).toBe(400);
    expect(current.style.visibility).toBe("hidden");
    expect(events.onSettled).toHaveBeenCalled();
    await clock.advance(4);
    expect(current.style.transform).toBe("");
  });

  it.each([
    {
      name: "comes in beside it",
      detail: "in",
      gap: 0,
      contentLeft: 300,
      content: { x: 100, y: 0, width: 400, height: 600 },
    },
    {
      name: "goes out over it",
      detail: "out",
      gap: 0,
      contentLeft: 0,
      content: { x: 100, y: 0, width: 700, height: 600 },
    },
    {
      name: "comes in a gap after it",
      detail: "in",
      gap: 8,
      contentLeft: 300,
      content: { x: 100, y: 0, width: 392, height: 600 },
    },
    {
      name: "goes out a gap after it",
      detail: "out",
      gap: 8,
      contentLeft: 0,
      content: { x: 100, y: 0, width: 700, height: 600 },
    },
  ] as const)(
    "keeps the inline end of the content its gap from a detail column that $name",
    async ({ detail, gap, contentLeft, content: box }) => {
      const { view, content, motion, show } = setUp();
      const column = element(
        { "data-split-view-column": "detail" },
        element({ "data-split-view-edge": "" }),
      );
      view.append(column);
      view.style.columnGap = `${String(gap)}px`;
      layOut(content, { x: contentLeft, y: 0, width: 500, height: 600 });
      show();
      layOut(content, box);
      layOut(column, { x: 500, y: 0, width: 300, height: 600 });
      const lengthOf = (pattern: RegExp, style: string) =>
        Number.parseFloat(pattern.exec(style)?.[1] ?? "0");
      const shownEnd = () => {
        const x = lengthOf(/translate\((-?[\d.]+)px/, content.style.transform);
        const reach = lengthOf(
          /(-?[\d.]+)px 0(?:px)? 0(?:px)? 0(?:px)? /,
          content.style.boxShadow,
        );
        const inset = lengthOf(
          /inset\(\S+ (-?[\d.]+)px/,
          content.style.clipPath,
        );
        // The fill reaches as far as the clip lets the content show.
        if (inset < 0) expect(reach).toBeCloseTo(-inset, 1);
        return box.x + box.width + x - inset;
      };
      motion.play(null, { content: null, detail }, 1);
      for (let frame = 0; frame < 90; frame++) {
        // The detail column that goes out shows only while it moves.
        if (detail === "in" || column.style.visibility === "visible") {
          const columnStart = 500 + (translateXOf(column) || 0);
          expect(Math.abs(shownEnd() + gap - columnStart)).toBeLessThan(0.1);
        }
        await clock.advance(1 / 60);
      }
      await clock.advance(3);
      expect(content.style.boxShadow).toBe("");
      expect(content.style.clipPath).toBe("");
    },
  );

  it("moves the boxes of the content page from their boxes at the width the column showed, less the slide of the column", async () => {
    const { view, content, current, motion, show } = setUp();
    const amount = element({});
    const list = element({}, amount);
    current.append(list);
    let left = 0;
    let width = 400;
    const layOutAt = layOutInColumn(content, () => width);
    layOutAt(content, (w) => ({ x: left, y: 0, width: w, height: 600 }));
    layOutAt(list, (w) => ({ x: left, y: 100, width: w, height: 40 }));
    layOutAt(amount, (w) => ({
      x: left + w - 100,
      y: 100,
      width: 100,
      height: 40,
    }));
    show();

    // The column starts 100px further on and gets 100px narrower.
    left = 100;
    width = 300;
    motion.play(null, IN, 1);
    expect(content.style.width).toBe("");
    expect(content.style.flexBasis).toBe("");
    // The column shows 100px to the inline start of its place, and the
    // amount shows where it showed.
    expect(content.style.transform).toBe("translate(-100.00px, 0.00px)");
    expect(amount.style.translate).toBe("100.00px 0.00px");
    expect(list.style.translate).toBe("");
    await clock.advance(3);
    expect(amount.style.translate).toBe("");
    expect(view.querySelectorAll("[style*=translate]")).toHaveLength(0);
  });

  it("turns a box of the content page that moves already from where it is, also where it shows outside the column", async () => {
    const { content, current, motion, show } = setUp();
    const amount = element({});
    const list = element({}, amount);
    current.append(list);
    let width = 400;
    const layOutAt = layOutInColumn(content, () => width);
    const shownX = () => Number.parseFloat(amount.style.translate) || 0;
    layOutAt(content, (w) => ({ x: 0, y: 0, width: w, height: 600 }));
    layOutAt(list, (w) => ({ x: 0, y: 100, width: w, height: 40 }));
    layOutAt(amount, (w) => ({
      x: w - 100 + shownX(),
      y: 100,
      width: 100,
      height: 40,
    }));
    show();

    width = 200;
    motion.play(null, IN, 1);
    await clock.advance(0.05);
    const shown = amount.getBoundingClientRect().left;
    // The amount shows past the inline end of the narrow column.
    expect(shown).toBeGreaterThan(200);

    width = 400;
    motion.play(null, OUT, 2);
    expect(amount.getBoundingClientRect().left).toBeCloseTo(shown, 1);
    await clock.advance(3);
    expect(amount.style.translate).toBe("");
  });

  it.each([
    { name: "pushes a page", change: { content: "push", detail: null } },
    { name: "swaps the detail", change: { content: null, detail: "swap" } },
  ] as const)(
    "does not read the boxes of the content page for a change that $name",
    ({ change }) => {
      const { current, motion, show } = setUp();
      const row = element({});
      current.append(row);
      const reads: Element[] = [];
      layOut(row, { x: 0, y: 100, width: 400, height: 40 }, reads);
      show();
      motion.play(null, change, 1);
      expect(reads).toEqual([]);
    },
  );

  it("starts a change that comes before a frame shows the last one from where the last one left the content", () => {
    const { content, motion, show } = setUp();
    show();
    layOut(content, { x: 100, y: 0, width: 400, height: 600 });
    motion.play(null, IN, 1);
    expect(content.style.transform).toBe("translate(-100.00px, 0.00px)");

    layOut(content, { x: 0, y: 0, width: 400, height: 600 });
    motion.play(null, OUT, 2);
    expect(content.style.transform).toBe("");
  });

  it("lets go of a content column that leaves the view as the observer sees it go", () => {
    const { view, content, observers } = setUp();
    const next = element({ "data-split-view-column": "content" });
    content.replaceWith(next);
    observers.resize(content, 0, 0);
    expect(observers.resizeObserversOf(content)).toBe(0);
    expect(observers.resizeObserversOf(next)).toBe(1);
    expect(view.contains(next)).toBe(true);
  });

  it("does not move a box of the content page that is a Shared element that flies", () => {
    const { view, content, current, marks, motion, show } = setUp();
    const row = element({});
    current.append(row);
    let width = 400;
    const layOutAt = layOutInColumn(content, () => width);
    layOutAt(content, (w) => ({ x: 0, y: 0, width: w, height: 600 }));
    // The row keeps its size and moves down in the narrower column.
    layOutAt(row, (w) => ({
      x: 0,
      y: w === 400 ? 100 : 200,
      width: 300,
      height: 40,
    }));
    addSplitViewMark(marks, "row", row);
    const snapshot = motion.capture();
    show();

    // The Shared element of the row flies into the detail.
    width = 300;
    const twin = element({});
    view.append(twin);
    layOut(twin, { x: 500, y: 0, width: 200, height: 40 });
    marks.clear();
    addSplitViewMark(marks, "row", twin);
    motion.play(snapshot, IN, 1);
    expect(row.style.opacity).toBe("0");
    expect(row.style.translate).toBe("");
  });

  it("under reduced motion, fades a swiped screen out where the finger left it", async () => {
    reduceMotion();
    const { under, current, motion } = setUp();
    expect(motion.beginSwipe()).toBe(true);
    motion.drag(0.25);
    expect(translateXOf(current)).toBe(300);
    expect(translateXOf(under)).toBe(0);
    motion.release(true, -2);
    await clock.advance(0.08);
    expect(translateXOf(current)).toBe(300);
    const opacity = Number(current.style.opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    current.setAttribute("data-split-view-page", "leaving");
    under.setAttribute("data-split-view-page", "current");
    motion.play(null, { ...NONE, content: "pop" }, 1);
    expect(translateXOf(current)).toBe(300);
    expect(Number(current.style.opacity)).toBeLessThanOrEqual(opacity);
    await clock.advance(1);
    expect(current.style.transform).toBe("");
    expect(current.style.opacity).toBe("");
  });

  it("under reduced motion, takes a swiped screen back in a short tween", async () => {
    reduceMotion();
    const { current, motion } = setUp();
    motion.beginSwipe();
    motion.drag(0.25);
    motion.release(false, 0);
    await clock.advance(0.08);
    expect(translateXOf(current)).toBeGreaterThan(0);
    expect(translateXOf(current)).toBeLessThan(300);
    await clock.advance(1);
    expect(current.style.transform).toBe("");
  });

  it("folds the sidebar, and stops its dust a moment after the motion", async () => {
    const { view, events, motion, show } = setUp();
    const full = element({ "data-split-view-sidebar": "full" });
    const collapsed = element({ "data-split-view-sidebar": "collapsed" });
    const sheet = document.createElement("style");
    sheet.textContent =
      '[data-split-view-sidebar="collapsed"] { visibility: hidden }';
    document.head.append(sheet);
    view.prepend(full, collapsed);
    layOut(full, { x: 0, y: 0, width: 240, height: 600 });
    layOut(collapsed, { x: 0, y: 0, width: 60, height: 600 });
    show();
    sheet.textContent =
      '[data-split-view-sidebar="full"] { visibility: hidden }';
    motion.play(null, NONE, 1);
    expect(events.onFold).toHaveBeenLastCalledWith("fold");
    expect(full.hasAttribute("data-split-view-leaving")).toBe(true);
    expect(full.style.visibility).toBe("visible");
    await clock.advance(1.4);
    expect(full.hasAttribute("data-split-view-leaving")).toBe(false);
    expect(full.style.visibility).toBe("");
    expect(events.onFold).toHaveBeenCalledTimes(1);
    await clock.advance(1);
    expect(events.onFold).toHaveBeenLastCalledWith(null);
    sheet.remove();
  });

  it("flies a part that a new form draws after it mounts", async () => {
    const { view, layer, marks, motion } = setUp();
    const line = element({});
    const chart = element({}, line);
    view.append(chart);
    layOut(chart, { x: 0, y: 0, width: 300, height: 100 });
    layOut(line, { x: 10, y: 10, width: 280, height: 80 });
    addSplitViewMark(marks, "chart", chart);
    const stopLine = addSplitViewMark(marks, "line", line);
    const snapshot = motion.capture();

    chart.remove();
    stopLine();
    const next = element({});
    view.append(next);
    layOut(next, { x: 400, y: 0, width: 400, height: 200 });
    addSplitViewMark(marks, "chart", next);
    motion.play(snapshot, NONE, 1);
    expect(next.style.opacity).toBe("0");
    expect(layer.childElementCount).toBe(0);

    const nextLine = element({});
    next.append(nextLine);
    layOut(nextLine, { x: 410, y: 10, width: 380, height: 180 });
    addSplitViewMark(marks, "line", nextLine);
    await clock.advance(0.016);
    expect(layer.childElementCount).toBe(2);
    expect(nextLine.style.opacity).toBe("0");
    await clock.advance(3);
    expect(layer.childElementCount).toBe(0);
    expect(nextLine.style.opacity).toBe("");
    expect(next.style.opacity).toBe("");
  });
});
