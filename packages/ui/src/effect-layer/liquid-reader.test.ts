import { afterEach, describe, expect, it, vi } from "vitest";
import { clockAt } from "../test-support/clock-at.ts";
import { mountSegmentTrack } from "../test-support/mount-segment-track.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
  type ElementTracker,
} from "./create-element-tracker.ts";
import { roleBits } from "./effect-roles.ts";
import {
  readEdge,
  readInsetRing,
  type LiquidControl,
} from "./liquid-reader.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { readFill } from "./read-element-box.ts";
import { PAGE_CARRIER, VIEWPORT_CARRIER } from "./resolve-carrier.ts";

describe("readEdge", () => {
  it("reads a ring and two shadows outside, and a ring inside", () => {
    expect(
      readEdge(
        "rgba(0, 0, 0, 0.08) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px, rgba(0, 0, 0, 0.06) 0px 2px 8px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0) 0px 1px 0px 0px inset",
      ),
    ).toEqual([0.08, 0.06, 0.06, 0]);
    expect(
      readEdge(
        "rgba(0, 0, 0, 0) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0) 0px 1px 2px 0px, rgba(0, 0, 0, 0) 0px 2px 8px 0px, rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset, rgba(255, 255, 255, 0.06) 0px 1px 0px 0px inset",
      ),
    ).toEqual([0, 0, 0, 0.1]);
  });

  it("reads no edge from no shadow", () => {
    expect(readEdge("none")).toEqual([0, 0, 0, 0]);
  });
});

describe("readInsetRing", () => {
  it("reads the colour and the width of a ring inside", () => {
    expect(
      readInsetRing(
        "rgb(121, 120, 117) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0.03) 0px 3px 5px -2px, rgba(0, 0, 0, 0.05) 0px 7px 14px -5px",
      ),
    ).toEqual({ color: readFill("rgb(121, 120, 117)"), width: 1 });
  });

  it("reads no ring from an inset shadow that is offset or blurred, or from no inset shadow", () => {
    expect(readInsetRing("rgba(0, 0, 0, 0.1) 0px 1px 0px 0px inset")).toBe(
      null,
    );
    expect(readInsetRing("rgba(0, 0, 0, 0.1) 0px 0px 2px 1px inset")).toBe(
      null,
    );
    expect(readInsetRing("rgba(0, 0, 0, 0.03) 0px 3px 5px -2px")).toBe(null);
    expect(readInsetRing("none")).toBe(null);
  });
});

describe("liquidReader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  const LIQUID = roleBits(["liquid"]);
  const AT_REST = { position: 0, drag: null, pressed: false };

  /**
   * A tracked segmented control with two segments, whose signals are
   * counted in `signals`.
   */
  function setUp({ fixed = false, vertical = false, roles = LIQUID } = {}) {
    const observers = stubObservers();
    const mounted = mountSegmentTrack({ vertical });
    const { track } = mounted;
    if (fixed) {
      track.style.position = "fixed";
    }
    const registry = createEffectRegistry();
    let tracker: ElementTracker | null = null;
    const signals: null[] = [];
    registry.track((element) => {
      tracker = createElementTracker(element, () => {
        signals.push(null);
      });
      return tracker;
    });
    const carrier = fixed ? VIEWPORT_CARRIER : PAGE_CARRIER;
    const registration = registry.register(
      track,
      roles,
      { liquid: AT_REST },
      { scope: PAGE_SCOPE, holds: null, carrier },
    );
    const measure = () => {
      tracker?.measure(createMeasureContext(() => 0, registry));
    };
    measure();
    signals.length = 0;
    const record = (scrollY = 0) => registry.records(clockAt(0, scrollY))[0];
    const read = (scrollY = 0) => record(scrollY).readings.liquid;
    return {
      ...mounted,
      observers,
      registration,
      carrier,
      measure,
      signals,
      record,
      read,
    };
  }

  /** Where the second segment starts, in px from the start of the track. */
  const secondStart = (control: LiquidControl | null | undefined) =>
    control == null
      ? Number.NaN
      : (control.stops[1].target - control.stops[1].span) * control.radius;

  it("reads a control when it is measured, and not again on frames where nothing changed", () => {
    const { segmentReads, read } = setUp();
    const control = read();
    expect(control?.stops).toHaveLength(2);
    expect(segmentReads).toHaveLength(2);
    expect(read()).toBe(control);
    expect(read()).toBe(control);
    expect(segmentReads).toHaveLength(2);
  });

  it("reads a segment that grows once its control is measured again", () => {
    const { segmentReads, layOutSegments, measure, read } = setUp();
    const before = read();
    layOutSegments([160, 100]);
    expect(read()).toBe(before);
    measure();
    const after = read();
    expect(segmentReads).toHaveLength(4);
    expect(after?.stops[0].span).toBeGreaterThan(before?.stops[0].span ?? 0);
    expect(secondStart(after)).toBeCloseTo(160, 6);
  });

  it("measures again after a segment changes size in a track that keeps its own", () => {
    const {
      observers,
      segments,
      segmentReads,
      layOutSegments,
      measure,
      signals,
      read,
    } = setUp();
    observers.resize(segments[0], 100, 40);
    observers.resize(segments[1], 100, 40);
    expect(signals).toHaveLength(0);

    layOutSegments([140, 60]);
    observers.resize(segments[0], 140, 40);
    expect(signals).toHaveLength(1);
    measure();
    expect(segmentReads).toHaveLength(4);
    expect(secondStart(read())).toBeCloseTo(140, 6);
  });

  it("reads an element once it takes the role, and stops observing its segments once it loses it", () => {
    const {
      observers,
      segments,
      registration,
      carrier,
      measure,
      signals,
      read,
    } = setUp({ roles: 0 });
    expect(read()).toBeUndefined();
    expect(observers.resizeObserversOf(segments[0])).toBe(0);

    registration.update(LIQUID, { liquid: AT_REST }, PAGE_SCOPE, carrier);
    expect(signals).toHaveLength(1);
    measure();
    expect(read()?.stops).toHaveLength(2);
    expect(observers.resizeObserversOf(segments[0])).toBe(1);

    registration.update(0, { liquid: AT_REST }, PAGE_SCOPE, carrier);
    measure();
    expect(read()).toBeUndefined();
    expect(observers.resizeObserversOf(segments[0])).toBe(0);
  });

  it("reads nothing again for a new position", () => {
    const { segmentReads, registration, carrier, signals, read } = setUp();
    const before = read();
    registration.update(
      LIQUID,
      { liquid: { ...AT_REST, position: 1 } },
      PAGE_SCOPE,
      carrier,
    );
    expect(signals).toHaveLength(0);
    expect(read()).toBe(before);
    expect(segmentReads).toHaveLength(2);
  });

  it("reads the stops of a vertical track down the page", () => {
    const { read } = setUp({ vertical: true });
    const control = read();
    expect(control?.vertical).toBe(true);
    expect(control?.radius).toBe(20);
    expect(control?.originX).toBe(20);
    expect(control?.originY).toBe(20);
    expect(secondStart(control)).toBeCloseTo(100, 6);
  });

  it("keeps the reading of a fixed control that a scroll moves in the page", () => {
    const { segmentReads, record } = setUp({ fixed: true });
    const before = record();
    const after = record(300);
    expect(after.readings).toBe(before.readings);
    expect(after.y - before.y).toBe(300);
    expect(segmentReads).toHaveLength(2);
  });
});
