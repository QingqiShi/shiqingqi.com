import { afterEach, describe, expect, it, vi } from "vitest";
import { clockAt } from "../test-support/clock-at.ts";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { fixedBottomTop } from "./compute-bands.ts";
import type { RegisteredRegion } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
  type ElementTracker,
  type MeasureContext,
} from "./create-element-tracker.ts";
import {
  PAGE_CARRIER,
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

/**
 * The context of one frame, at a scroll, where every element declares
 * `carrier`, sticky carrier 1 on the page is `stickyBox` and is stuck when
 * `stuck` says so, and `region` is the only Scroll region.
 */
function context(
  scrollX = 0,
  scrollY = 0,
  carrier: EffectCarrierRef = PAGE_CARRIER,
  stickyBox: Element | null = null,
  viewportBottom = 0,
  region?: RegisteredRegion,
  stuck = false,
): MeasureContext {
  return {
    ...createMeasureContext(() => viewportBottom, {
      carrierOf: () => carrier,
      sticky: (id) =>
        id === 1 && stickyBox !== null
          ? {
              element: stickyBox,
              carrier: { kind: "sticky", id, parent: PAGE_CARRIER },
              isStuck: () => stuck,
            }
          : undefined,
      region: (id) => (id === region?.id ? region : undefined),
      isInModalCover: () => false,
      rolesOf: () => 0,
    }),
    scrollX,
    scrollY,
  };
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
      box: { x: 10, y: 20, width: 100, height: 40 },
      carrier: { key: "page" },
    });
    expect(tracker.boxAt(clockAt(0, 900, 0))).toMatchObject({ x: 10, y: 520 });
  });

  it("takes the carrier it declares, not from where the browser lays the element out", () => {
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    tracker.measure(context(0, 500));
    expect(tracker.measured?.carrier.key).toBe("page");
    expect(console.warn).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });

  it("does not check the declared carrier in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    tracker.measure(context(0, 500));
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("draws on the fixed canvas while its sticky carrier is stuck, and in the document once the box lets go", () => {
    const { element, tracker } = setUp();
    const bar = document.createElement("div");
    bar.style.position = "sticky";
    bar.style.top = "0px";
    document.body.append(bar);
    bar.append(element);
    const carrier: EffectCarrierRef = {
      kind: "sticky",
      id: 1,
      parent: PAGE_CARRIER,
    };
    layOut(bar, { x: 0, y: 0, width: 300, height: 60 });
    tracker.measure(context(0, 500, carrier, bar, 0, undefined, true));
    expect(tracker.measured?.carrier.key).toBe("fixed");
    expect(tracker.boxAt(clockAt(0, 900, 0))).toMatchObject({ x: 10, y: 920 });

    layOut(bar, { x: 0, y: -40, width: 300, height: 60 });
    tracker.measure(context(0, 500, carrier, bar, 0, undefined, false));
    expect(tracker.measured?.carrier.key).toBe("page");
    expect(tracker.boxAt(clockAt(0, 900, 0))).toMatchObject({ x: 10, y: 520 });
  });

  it("moves an element on the viewport with the scroll it is asked at", () => {
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    tracker.measure(context(0, 500, VIEWPORT_CARRIER));
    expect(tracker.measured?.carrier.key).toBe("fixed");
    expect(tracker.boxAt(clockAt(0, 900, 0))).toMatchObject({ x: 10, y: 920 });
  });

  it("keeps an element on the viewport's bottom edge at its distance from that edge", () => {
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    element.style.bottom = "16px";
    layOut(element, { x: 16, y: 736, width: 300, height: 48 });
    tracker.measure(context(0, 500, VIEWPORT_BOTTOM_CARRIER, null, 800));
    expect(tracker.measured?.carrier.key).toBe("fixedBottom");
    expect(tracker.boxAt(clockAt(0, 900, 800))).toMatchObject({
      x: 16,
      y: 1636,
    });
    expect(tracker.boxAt(clockAt(0, 900, 760))).toMatchObject({
      x: 16,
      y: 1596,
    });
  });

  it("keeps an element on the viewport's bottom edge at one place on the bottom canvas while the edge moves, with no new measurement", () => {
    const { element, tracker } = setUp();
    element.style.position = "fixed";
    element.style.bottom = "16px";
    layOut(element, { x: 16, y: 736, width: 300, height: 48 });
    tracker.measure(context(0, 0, VIEWPORT_BOTTOM_CARRIER, null, 800));
    const canvasHeight = 900;
    const onCanvas = (scrollY: number, viewportBottom: number) =>
      (tracker.boxAt(clockAt(0, scrollY, viewportBottom))?.y ?? Number.NaN) -
      fixedBottomTop(scrollY, viewportBottom, canvasHeight);
    const measured = tracker.measured;
    const places = [
      [0, 800],
      [0, 760],
      [0, 860],
      [1200, 731.5],
    ].map(([scrollY, viewportBottom]) => onCanvas(scrollY, viewportBottom));
    expect(tracker.measured).toBe(measured);
    expect(places).toEqual([836, 836, 836, 836]);
  });

  it("keeps an element in a Scroll region at its place in the content box, which no scroll changes", () => {
    const { observers, element, tracker } = setUp();
    const scroller = document.createElement("div");
    const content = document.createElement("div");
    document.body.append(scroller);
    scroller.append(content);
    content.append(element);
    layOut(content, { x: 0, y: -300, width: 400, height: 2000 });
    const region = { id: 4, scroller, content, parent: PAGE_CARRIER };
    const carrier: EffectCarrierRef = {
      kind: "region",
      id: 4,
      parent: PAGE_CARRIER,
    };
    tracker.measure(context(0, 500, carrier, null, 0, region));
    expect(tracker.measured).toMatchObject({
      carrier: { key: 4 },
      local: { x: 10, y: 320, width: 100, height: 40 },
    });
    expect(
      tracker.boxAt(clockAt(0, 900, 0, new Map([[4, { x: 50, y: 700 }]]))),
    ).toMatchObject({ x: 60, y: 1020 });
    expect(tracker.boxAt(clockAt(0, 900))).toBeNull();
    expect(observers.intersectionRootsOf(element)).toEqual([content]);
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
