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
