import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import {
  createElementTracker,
  createMeasureContext,
  type ElementTracker,
  type MeasureContext,
} from "./create-element-tracker.ts";

/** The context of one frame, at a scroll. */
function context(scrollX = 0, scrollY = 0): MeasureContext {
  return { ...createMeasureContext(), scrollX, scrollY };
}

function setUp() {
  const observers = stubObservers();
  const element = document.createElement("div");
  document.body.append(element);
  layOut(element, { x: 10, y: 20, width: 100, height: 40 });
  const signals: ElementTracker[] = [];
  const tracker = createElementTracker(element, (signalled) => {
    signals.push(signalled);
  });
  return { observers, element, signals, tracker };
}

/** Makes `source` run a CSS animation while `running()` is true. */
function animate(source: Element, running: () => boolean) {
  // jsdom has no Web Animations API.
  Object.defineProperty(source, "getAnimations", {
    configurable: true,
    value: () => (running() ? [{ pending: false, playState: "running" }] : []),
  });
}

describe("createElementTracker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("queues itself when it is created, before it has a measurement", () => {
    const { signals, tracker } = setUp();
    expect(signals).toEqual([tracker]);
    expect(tracker.measured).toBeNull();
  });

  it("keeps an element in the document at the page position it was measured at", () => {
    const { tracker } = setUp();
    tracker.measure(context(0, 500));
    expect(tracker.measured).toMatchObject({
      box: { x: 10, y: 20, width: 100, height: 40, fixed: false },
      sticky: false,
    });
    expect(tracker.boxAt(0, 900)).toMatchObject({ x: 10, y: 520 });
  });

  it("moves a fixed element with the scroll it is asked at", () => {
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    tracker.measure(context(0, 500));
    expect(tracker.boxAt(0, 900)).toMatchObject({ x: 10, y: 920, fixed: true });
  });

  it("queues itself when its own ResizeObserver reports a new size", () => {
    const { observers, element, signals, tracker } = setUp();
    tracker.measure(context());
    signals.length = 0;
    observers.resize(element, 100, 40);
    expect(signals).toEqual([]);
    observers.resize(element, 120, 40);
    expect(signals).toEqual([tracker]);
  });

  it("queues itself for a size it has not measured yet", () => {
    const { observers, element, signals, tracker } = setUp();
    signals.length = 0;
    observers.resize(element, 100, 40);
    expect(signals).toEqual([tracker]);
  });

  it("watches for a move from where it measured the element", () => {
    const { observers, tracker } = setUp();
    expect(observers.intersectionObservers()).toBe(0);
    tracker.measure(context());
    expect(observers.intersectionObservers()).toBe(1);
  });

  it("forgets an element without a box, and stops watching it", () => {
    const { observers, element, tracker } = setUp();
    tracker.measure(context());
    layOut(element, { x: 10, y: 20, width: 0, height: 0 });
    tracker.measure(context());
    expect(tracker.measured).toBeNull();
    expect(observers.intersectionObservers()).toBe(0);
  });

  it("does not read an element that left the document", () => {
    const { element, tracker } = setUp();
    const reads: Element[] = [];
    layOut(element, { x: 0, y: 0, width: 10, height: 10 }, reads);
    element.remove();
    tracker.measure(context());
    expect(reads).toEqual([]);
    expect(tracker.measured).toBeNull();
  });

  it("queues itself each frame while an animation runs, and measures once more after it stops", () => {
    const { element, signals, tracker } = setUp();
    let running = true;
    animate(element, () => running);
    tracker.follow(element);
    expect(signals).toHaveLength(2);

    tracker.measure(context());
    tracker.measure(context());
    expect(signals).toHaveLength(4);

    running = false;
    layOut(element, { x: 60, y: 20, width: 100, height: 40 });
    tracker.measure(context());
    expect(signals).toHaveLength(4);
    expect(tracker.measured?.box.x).toBe(60);
  });

  it("watches for a move only after the animation it follows stops", () => {
    const { observers, element, tracker } = setUp();
    let running = true;
    animate(element, () => running);
    tracker.follow(element);
    tracker.measure(context());
    expect(observers.intersectionObservers()).toBe(0);
    running = false;
    tracker.measure(context());
    expect(observers.intersectionObservers()).toBe(1);
  });

  it("stops following an animation source that left the document", () => {
    const { signals, tracker } = setUp();
    const source = document.createElement("div");
    animate(source, () => true);
    tracker.follow(source);
    signals.length = 0;
    tracker.measure(context());
    expect(signals).toEqual([]);
  });

  it("disconnects its observers and signals nothing after it is destroyed", () => {
    const { observers, element, signals, tracker } = setUp();
    tracker.measure(context());
    signals.length = 0;
    tracker.destroy();
    observers.resize(element, 120, 40);
    tracker.signal();
    expect(signals).toEqual([]);
    expect(observers.resizeObserversOf(element)).toBe(0);
    expect(observers.intersectionObservers()).toBe(0);
  });
});
