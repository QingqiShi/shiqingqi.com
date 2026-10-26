import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMotionEngine } from "../motion/create-motion-engine.ts";
import { fakeMotionClock } from "../test-support/fake-motion-clock.ts";
import { layOut } from "../test-support/lay-out.ts";
import { reduceMotion } from "../test-support/reduce-motion.ts";
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
  document.body.replaceChildren();
});

const NONE = { content: null, detail: null } as const;

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
  const engine = createMotionEngine();
  const motion = createSplitViewMotion(engine, view, layer, marks, events);
  return { view, layer, content, under, current, marks, events, motion };
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
      const { view, content, motion } = setUp();
      const column = element(
        { "data-split-view-column": "detail" },
        element({ "data-split-view-edge": "" }),
      );
      view.append(column);
      view.style.columnGap = `${String(gap)}px`;
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
      motion.play(
        { marks: new Map(), origin: null, contentLeft, sidebar: null },
        { content: null, detail },
        1,
      );
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
    const { view, events, motion } = setUp();
    const full = element({ "data-split-view-sidebar": "full" });
    const collapsed = element({ "data-split-view-sidebar": "collapsed" });
    const sheet = document.createElement("style");
    sheet.textContent =
      '[data-split-view-sidebar="full"] { visibility: hidden }';
    document.head.append(sheet);
    view.prepend(full, collapsed);
    layOut(full, { x: 0, y: 0, width: 240, height: 600 });
    layOut(collapsed, { x: 0, y: 0, width: 60, height: 600 });
    motion.play(
      { marks: new Map(), origin: null, contentLeft: null, sidebar: "full" },
      NONE,
      1,
    );
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
