import { afterEach, describe, expect, it, vi } from "vitest";
import { clockAt } from "../test-support/clock-at.ts";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
} from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import {
  PAGE_CARRIER,
  VIEWPORT_BOTTOM_CARRIER,
  VIEWPORT_CARRIER,
} from "./resolve-carrier.ts";

const ON_PAGE = { scope: PAGE_SCOPE, holds: null };

function element(x: number, y: number, reads?: Element[]) {
  const div = document.createElement("div");
  document.body.append(div);
  layOut(div, { x, y, width: 100, height: 40 }, reads);
  return div;
}

/** A registry that tracks its elements, and a way to measure them all. */
function setUp() {
  const observers = stubObservers();
  const registry = createEffectRegistry();
  const untrack = registry.track((tracked) =>
    createElementTracker(tracked, () => {}),
  );
  const measureAll = (scrollX = 0, scrollY = 0) => {
    for (const tracker of registry.trackers()) {
      tracker.measure({
        ...createMeasureContext(() => 0, registry),
        scrollX,
        scrollY,
      });
    }
  };
  return { observers, registry, untrack, measureAll };
}

describe("createEffectRegistry tracking", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("gives a tracker to each element registered before and after tracking starts", () => {
    const observers = stubObservers();
    const registry = createEffectRegistry();
    const before = element(0, 0);
    registry.register(before, 0, NO_SETTINGS, ON_PAGE);
    registry.track((tracked) => createElementTracker(tracked, () => {}));
    const after = element(0, 100);
    registry.register(after, 0, NO_SETTINGS, ON_PAGE);
    expect([...registry.trackers()].map(({ element }) => element)).toEqual([
      before,
      after,
    ]);
    expect(observers.resizeObserversOf(before)).toBe(1);
    expect(observers.resizeObserversOf(after)).toBe(1);
  });

  it("shares one tracker between the registrations of an element, and destroys it with the last", () => {
    const { observers, registry } = setUp();
    const target = element(0, 0);
    const first = registry.register(target, 0b01, NO_SETTINGS, ON_PAGE);
    const second = registry.register(target, 0b10, NO_SETTINGS, ON_PAGE);
    expect([...registry.trackers()]).toHaveLength(1);
    first.remove();
    expect(observers.resizeObserversOf(target)).toBe(1);
    second.remove();
    expect([...registry.trackers()]).toHaveLength(0);
    expect(observers.resizeObserversOf(target)).toBe(0);
  });

  it("gives an element that registers again a new tracker, and leaks nothing", () => {
    const { observers, registry, measureAll } = setUp();
    const target = element(0, 0);
    registry.register(target, 0, NO_SETTINGS, ON_PAGE).remove();
    registry.register(target, 0, NO_SETTINGS, ON_PAGE);
    measureAll();
    expect(observers.resizeObserversOf(target)).toBe(1);
    expect(observers.intersectionObservers()).toBe(1);
  });

  it("destroys every tracker when tracking stops", () => {
    const { observers, registry, untrack, measureAll } = setUp();
    const target = element(0, 0);
    registry.register(target, 0, NO_SETTINGS, ON_PAGE);
    measureAll();
    untrack();
    expect([...registry.trackers()]).toHaveLength(0);
    expect(observers.resizeObserversOf(target)).toBe(0);
    expect(observers.intersectionObservers()).toBe(0);
    expect(registry.records(clockAt())).toEqual([]);
  });
});

describe("createEffectRegistry records", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("leaves out an element until it is measured", () => {
    const { registry, measureAll } = setUp();
    const target = element(0, 0);
    registry.register(target, 0, NO_SETTINGS, ON_PAGE);
    expect(registry.records(clockAt())).toEqual([]);
    measureAll();
    expect(registry.records(clockAt()).map((record) => record.element)).toEqual(
      [target],
    );
  });

  it("lists the elements in registration order, each on the canvas of the carrier it declares", () => {
    const { registry, measureAll } = setUp();
    const onViewport = element(0, 0);
    onViewport.style.position = "fixed";
    const onPage = element(0, 100);
    registry.register(onViewport, 0, NO_SETTINGS, {
      ...ON_PAGE,
      carrier: VIEWPORT_CARRIER,
    });
    registry.register(onPage, 0, NO_SETTINGS, ON_PAGE);
    measureAll();
    expect(
      registry
        .records(clockAt())
        .map(({ element: target, carrier, carriers }) => ({
          target,
          carrier,
          carriers,
        })),
    ).toEqual([
      { target: onViewport, carrier: "fixed", carriers: ["fixed"] },
      { target: onPage, carrier: "page", carriers: ["page"] },
    ]);
  });

  it("takes the carrier from the latest registration, as it takes the scope, and measures again on a new one", () => {
    const signals: Element[] = [];
    stubObservers();
    const registry = createEffectRegistry();
    registry.track((tracked) =>
      createElementTracker(tracked, ({ element: signalled }) => {
        signals.push(signalled);
      }),
    );
    const target = element(0, 0);
    const first = registry.register(target, 0, NO_SETTINGS, {
      ...ON_PAGE,
      carrier: VIEWPORT_CARRIER,
    });
    registry.register(target, 0b1, NO_SETTINGS, ON_PAGE);
    expect(registry.carrierOf(target)).toBe(PAGE_CARRIER);
    signals.length = 0;

    first.update(0, NO_SETTINGS, 0, VIEWPORT_BOTTOM_CARRIER);
    expect(signals).toEqual([target]);
    expect(registry.carrierOf(target)).toBe(PAGE_CARRIER);
  });

  it("lets an element on a sticky carrier need the canvases of both of its states", () => {
    const { registry, measureAll } = setUp();
    const target = element(0, 0);
    registry.register(target, 0b1, NO_SETTINGS, {
      ...ON_PAGE,
      carrier: { kind: "sticky", id: 9, parent: PAGE_CARRIER },
    });
    measureAll();
    expect(registry.records(clockAt())[0]).toMatchObject({
      carrier: "page",
      carriers: ["page", "fixed"],
    });
  });

  it("puts the effect hooks of a sticky box itself on its sticky carrier", () => {
    const { registry } = setUp();
    const box = element(0, 0);
    registry.register(box, 0, NO_SETTINGS, ON_PAGE);
    expect(registry.carrierOf(box)).toBe(PAGE_CARRIER);
    const carrier = { kind: "sticky", id: 5, parent: PAGE_CARRIER } as const;
    const sticky = registry.registerSticky(box, carrier, () => false);
    expect(registry.carrierOf(box)).toBe(carrier);
    expect(registry.elements().get(box)?.carriers).toEqual(["page", "fixed"]);
    sticky.remove();
    expect(registry.carrierOf(box)).toBe(PAGE_CARRIER);
    expect(registry.elements().get(box)?.carriers).toEqual(["page"]);
  });

  it("keeps a sticky box apart from the elements, and tells the layer each time it registers, sticks, lets go or leaves", () => {
    const registry = createEffectRegistry();
    const box = element(0, 0);
    let stuck = false;
    const early = registry.registerSticky(
      box,
      { kind: "sticky", id: 3, parent: PAGE_CARRIER },
      () => stuck,
    );
    const told: number[] = [];
    const untrack = registry.track(
      (tracked) => createElementTracker(tracked, () => {}),
      (id) => {
        told.push(id);
      },
    );
    const late = registry.registerSticky(
      element(0, 50),
      { kind: "sticky", id: 4, parent: PAGE_CARRIER },
      () => false,
    );
    expect(told).toEqual([4]);
    expect(registry.sticky(3)?.element).toBe(box);
    expect(registry.elements().size).toBe(0);

    stuck = true;
    early.changed();
    expect(told).toEqual([4, 3]);
    expect(registry.sticky(3)?.isStuck()).toBe(true);

    late.remove();
    expect(told).toEqual([4, 3, 4]);
    expect(registry.sticky(4)).toBeUndefined();
    late.changed();
    expect(told).toEqual([4, 3, 4]);
    untrack();
    early.remove();
    expect(told).toEqual([4, 3, 4]);
    expect(registry.sticky(3)).toBeUndefined();
  });

  it("keeps an element in the document at its page position through a window scroll", () => {
    const { registry, measureAll } = setUp();
    const reads: Element[] = [];
    registry.register(element(0, 20, reads), 0, NO_SETTINGS, ON_PAGE);
    measureAll(0, 500);
    reads.length = 0;
    expect(registry.records(clockAt(0, 900))[0]).toMatchObject({
      x: 0,
      y: 520,
    });
    expect(reads).toEqual([]);
  });

  it("moves an element on the viewport with each window scroll, without reading it", () => {
    const { registry, measureAll } = setUp();
    const reads: Element[] = [];
    const target = element(20, 10, reads);
    target.style.position = "fixed";
    registry.register(target, 0, NO_SETTINGS, {
      ...ON_PAGE,
      carrier: VIEWPORT_CARRIER,
    });
    measureAll(0, 500);
    reads.length = 0;
    expect(registry.records(clockAt(0, 900))[0]).toMatchObject({
      x: 20,
      y: 910,
      carrier: "fixed",
    });
    expect(reads).toEqual([]);
  });

  it("gives each element the scope its registration puts it in, without reading the DOM", () => {
    const { registry, measureAll } = setUp();
    const container = element(0, 0);
    const child = element(10, 10);
    const inside = registry.register(child, 0b100, NO_SETTINGS, {
      scope: 7,
      holds: null,
    });
    measureAll();
    expect(registry.records(clockAt())).toMatchObject([
      { element: child, scope: 7, holds: null },
    ]);

    registry.register(container, 0, NO_SETTINGS, { scope: 0, holds: 7 });
    measureAll();
    expect(registry.records(clockAt())).toMatchObject([
      { element: child, scope: 7, holds: null },
      { element: container, scope: 0, holds: 7 },
    ]);

    inside.update(0b100, NO_SETTINGS, 0, PAGE_CARRIER);
    expect(registry.records(clockAt())[0]).toMatchObject({ scope: 0 });
  });

  it("keeps an element an Effect container while one of its registrations makes it one", () => {
    const { registry } = setUp();
    const container = element(0, 0);
    const asContainer = registry.register(container, 0, NO_SETTINGS, {
      scope: 3,
      holds: 7,
    });
    registry.register(container, 0b100, NO_SETTINGS, { scope: 3, holds: null });
    expect(registry.elements().get(container)).toMatchObject({
      roles: 0b100,
      scope: 3,
      holds: 7,
    });
    asContainer.remove();
    expect(registry.elements().get(container)).toMatchObject({
      scope: 3,
      holds: null,
    });
  });

  it("takes new roles and settings without reading the element again", () => {
    const { registry, measureAll } = setUp();
    const reads: Element[] = [];
    const registration = registry.register(
      element(0, 0, reads),
      0,
      NO_SETTINGS,
      ON_PAGE,
    );
    measureAll();
    reads.length = 0;
    const settings = { dust: { density: 7 } };
    registration.update(0b10, settings, 0, PAGE_CARRIER);
    expect(registry.records(clockAt())[0]).toMatchObject({
      roles: 0b10,
      settings,
    });
    expect(reads).toEqual([]);
  });
});

describe("createEffectRegistry Scroll regions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  /** A scroller with a content box, and a control in it on the region. */
  function setUpRegion() {
    const setup = setUp();
    const scroller = element(0, 100);
    const content = document.createElement("div");
    scroller.append(content);
    layOut(content, { x: 0, y: 60, width: 400, height: 900 });
    const control = document.createElement("div");
    content.append(control);
    layOut(control, { x: 20, y: 160, width: 100, height: 40 });
    const carrier = { kind: "region", id: 6, parent: PAGE_CARRIER } as const;
    setup.registry.register(scroller, 0, NO_SETTINGS, ON_PAGE);
    setup.registry.register(control, 0b1, NO_SETTINGS, { ...ON_PAGE, carrier });
    return { ...setup, scroller, content, control, carrier };
  }

  it("tracks a region once it has its scroller and its content box, and draws its elements on the parent until then", () => {
    const { registry, measureAll, scroller, content, control } = setUpRegion();
    const watched: number[] = [];
    registry.track(
      (tracked) => createElementTracker(tracked, () => {}),
      undefined,
      ({ id }) => {
        watched.push(id);
        return { destroy: () => {} };
      },
    );
    const removeScroller = registry.registerRegion(
      6,
      PAGE_CARRIER,
      "scroller",
      scroller,
    );
    measureAll(0, 300);
    expect(registry.region(6)).toBeUndefined();
    expect(watched).toEqual([]);
    expect(registry.records(clockAt(0, 300))).toMatchObject([
      { element: scroller, carrier: "page" },
      { element: control, carrier: "page", y: 460 },
    ]);

    registry.registerRegion(6, PAGE_CARRIER, "content", content);
    measureAll(0, 300);
    expect(watched).toEqual([6]);
    expect(registry.region(6)).toMatchObject({ scroller, content });
    expect(registry.regionOfScroller(scroller)).toBe(6);
    removeScroller();
    expect(registry.region(6)).toBeUndefined();
  });

  it("gives each element on a region its place in the content box plus the region's origin, which a scroll of the region does not change", () => {
    const { registry, measureAll, scroller, content, control } = setUpRegion();
    registry.registerRegion(6, PAGE_CARRIER, "scroller", scroller);
    registry.registerRegion(6, PAGE_CARRIER, "content", content);
    measureAll(0, 300);
    const at = (origin: { x: number; y: number }) =>
      registry
        .records(clockAt(0, 300, 0, new Map([[6, origin]])))
        .find((record) => record.element === control);
    expect(at({ x: 0, y: 360 })).toMatchObject({
      x: 20,
      y: 460,
      carrier: 6,
      carriers: [6],
    });
    expect(at({ x: 0, y: 160 })).toMatchObject({ x: 20, y: 260 });
    expect(
      registry.records(clockAt(0, 300)).map((record) => record.element),
    ).toEqual([scroller]);
  });

  it("puts the effect hooks of a scroller itself on the region's parent", () => {
    const { registry, scroller, content, carrier } = setUpRegion();
    registry.register(scroller, 0, NO_SETTINGS, { ...ON_PAGE, carrier });
    registry.registerRegion(6, VIEWPORT_CARRIER, "scroller", scroller);
    registry.registerRegion(6, VIEWPORT_CARRIER, "content", content);
    expect(registry.carrierOf(scroller)).toBe(VIEWPORT_CARRIER);
  });
});

describe("createEffectRegistry covers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  /** A fixed sheet over the bottom of the page, with a control inside it. */
  function setUpSheet() {
    const setup = setUp();
    const sheet = element(0, 500, undefined);
    sheet.style.position = "fixed";
    layOut(sheet, { x: 0, y: 500, width: 400, height: 300 });
    const inSheet = document.createElement("div");
    sheet.append(inSheet);
    layOut(inSheet, { x: 20, y: 520, width: 100, height: 40 });
    const under = element(20, 600);
    const beside = element(20, 100);
    for (const target of [under, inSheet, beside]) {
      setup.registry.register(target, 0b1, NO_SETTINGS, ON_PAGE);
    }
    setup.registry.register(sheet, 0, NO_SETTINGS, {
      ...ON_PAGE,
      covers: true,
    });
    setup.measureAll();
    return { ...setup, sheet, under, inSheet, beside };
  }

  const elementsOf = (registry: ReturnType<typeof createEffectRegistry>) =>
    registry.records(clockAt()).map((record) => record.element);

  it("leaves out the elements under a cover and the cover, and keeps those inside it or outside its box", () => {
    const { registry, inSheet, beside } = setUpSheet();
    expect(elementsOf(registry)).toEqual([beside, inSheet]);
  });

  it("gives the elements under a cover back when the cover can no longer be seen", () => {
    const { registry, measureAll, sheet, under, beside } = setUpSheet();
    sheet.style.opacity = "0";
    measureAll();
    expect(elementsOf(registry)).toEqual([under, beside]);
  });
});

describe("createEffectRegistry modal covers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("lists each modal cover that has a box", () => {
    const { registry, measureAll } = setUp();
    const sheet = element(0, 0);
    const menu = element(0, 100);
    registry.register(sheet, 0, NO_SETTINGS, {
      ...ON_PAGE,
      covers: true,
      modal: true,
    });
    registry.register(menu, 0, NO_SETTINGS, { ...ON_PAGE, covers: true });
    expect(registry.modalCovers()).toEqual([]);
    measureAll();
    expect(registry.modalCovers()).toEqual([sheet]);
    sheet.style.visibility = "hidden";
    measureAll();
    expect(registry.modalCovers()).toEqual([]);
  });

  it("knows each element in a modal cover from the time the cover registers", () => {
    const { registry } = setUp();
    const sheet = element(0, 0);
    const menu = element(0, 100);
    const inSheet = sheet.appendChild(document.createElement("button"));
    const inMenu = menu.appendChild(document.createElement("button"));
    registry.register(sheet, 0, NO_SETTINGS, {
      ...ON_PAGE,
      covers: true,
      modal: true,
    });
    registry.register(menu, 0, NO_SETTINGS, { ...ON_PAGE, covers: true });
    expect(registry.isInModalCover(inSheet)).toBe(true);
    expect(registry.isInModalCover(sheet)).toBe(true);
    expect(registry.isInModalCover(inMenu)).toBe(false);
  });
});
