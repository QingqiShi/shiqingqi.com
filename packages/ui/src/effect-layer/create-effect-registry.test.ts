import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
} from "./create-element-tracker.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";

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
      tracker.measure({ ...createMeasureContext(), scrollX, scrollY });
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
    expect(registry.records(0, 0)).toEqual([]);
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
    expect(registry.records(0, 0)).toEqual([]);
    measureAll();
    expect(registry.records(0, 0).map((record) => record.element)).toEqual([
      target,
    ]);
  });

  it("lists elements in the document first, then fixed ones, each in registration order", () => {
    const { registry, measureAll } = setUp();
    const fixedFirst = element(0, 0);
    fixedFirst.style.position = "fixed";
    const inDocument = element(0, 100);
    const fixedSecond = element(0, 200);
    fixedSecond.style.position = "fixed";
    const lastInDocument = element(0, 300);
    for (const target of [
      fixedFirst,
      inDocument,
      fixedSecond,
      lastInDocument,
    ]) {
      registry.register(target, 0, NO_SETTINGS, ON_PAGE);
    }
    measureAll();
    expect(registry.records(0, 0).map((record) => record.element)).toEqual([
      inDocument,
      lastInDocument,
      fixedFirst,
      fixedSecond,
    ]);
  });

  it("keeps an element in the document at its page position through a window scroll", () => {
    const { registry, measureAll } = setUp();
    const reads: Element[] = [];
    registry.register(element(0, 20, reads), 0, NO_SETTINGS, ON_PAGE);
    measureAll(0, 500);
    reads.length = 0;
    expect(registry.records(0, 900)[0]).toMatchObject({ x: 0, y: 520 });
    expect(reads).toEqual([]);
  });

  it("moves a fixed element with each window scroll, without reading it", () => {
    const { registry, measureAll } = setUp();
    const reads: Element[] = [];
    const target = element(20, 10, reads);
    target.style.position = "fixed";
    registry.register(target, 0, NO_SETTINGS, ON_PAGE);
    measureAll(0, 500);
    reads.length = 0;
    expect(registry.records(0, 900)[0]).toMatchObject({
      x: 20,
      y: 910,
      fixed: true,
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
    expect(registry.records(0, 0)).toMatchObject([
      { element: child, scope: 7, holds: null },
    ]);

    registry.register(container, 0, NO_SETTINGS, { scope: 0, holds: 7 });
    measureAll();
    expect(registry.records(0, 0)).toMatchObject([
      { element: child, scope: 7, holds: null },
      { element: container, scope: 0, holds: 7 },
    ]);

    inside.update(0b100, NO_SETTINGS, 0);
    expect(registry.records(0, 0)[0]).toMatchObject({ scope: 0 });
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
    registration.update(0b10, settings, 0);
    expect(registry.records(0, 0)[0]).toMatchObject({ roles: 0b10, settings });
    expect(reads).toEqual([]);
  });
});
