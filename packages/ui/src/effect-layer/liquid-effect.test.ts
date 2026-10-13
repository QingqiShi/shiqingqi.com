import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { layOut } from "../test-support/lay-out.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
  type ElementTracker,
} from "./create-element-tracker.ts";
import { roleBits } from "./effect-roles.ts";
import { FROST_CONTRAST } from "./glow-colors.ts";
import {
  createControlReader,
  layoutLiquid,
  pillAt,
  type LiquidControl,
  type LiquidState,
} from "./liquid-effect.ts";
import { LIQUID_INDICATOR, LIQUID_SEGMENT } from "./liquid-indicator.ts";
import type { LiquidBeadInstance } from "./liquid-wgsl.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { readFill } from "./read-element-box.ts";
import {
  mean,
  simulateLiquid,
  type LiquidParticles,
  type LiquidSnapshot,
} from "./step-liquid.ts";
import type { EffectSettings } from "./types.ts";

type Liquid = NonNullable<EffectSettings["liquid"]>;

const SLOT = 2;
const BACKDROP = readFill("rgb(250, 250, 250)");

/**
 * Lays one control's liquid out frame by frame, with the CPU reference in
 * the GPU's place: it runs each step the layout asks for, and sends the
 * particles back a frame later, as the GPU's readback does.
 */
function createRun(id: number, elementIndex: number) {
  let slot: LiquidParticles | null = null;
  let pending: LiquidSnapshot | null = null;
  let latest: LiquidSnapshot | null = null;
  let state: LiquidState | undefined;
  let time = 0;
  return (
    control: LiquidControl,
    liquid: Liquid,
    beads: LiquidBeadInstance[] = [],
  ) => {
    time += 1 / 60;
    latest = pending ?? latest;
    pending = null;
    const laid = layoutLiquid(
      control,
      { id, settings: { liquid } },
      elementIndex,
      SLOT,
      state,
      { time, delta: 1 / 60, reducedMotion: false },
      BACKDROP,
      latest,
      beads,
    );
    if (laid.seed) {
      slot = laid.state.body;
    }
    if (laid.step !== null) {
      if (slot === null) {
        throw new Error("The step has no particles to move.");
      }
      const { target, span, aim, from, to, scale, step } = laid.step;
      expect(laid.step.slot).toBe(SLOT);
      expect(laid.step.count).toBe(slot.x.length);
      slot = simulateLiquid(
        slot,
        { target, span, aim, from, to, pressed: false, reducedMotion: false },
        scale,
        step,
      );
      pending = { particles: slot, time: laid.state.simulated };
    }
    state = laid.state;
    return laid;
  };
}

describe("pillAt", () => {
  const stops = [
    { target: 1, span: 0.5 },
    { target: 4, span: 1.5 },
  ];

  it("goes between two stops in place and in length", () => {
    expect(pillAt(stops, 0.5)).toEqual({ target: 2.5, span: 1 });
  });

  it("is the stop itself at a whole index", () => {
    expect(pillAt(stops, 1)).toEqual(stops[1]);
    expect(pillAt([stops[0]], 0)).toEqual(stops[0]);
  });
});

describe("layoutLiquid", () => {
  it("lays a Switch's liquid out frame by frame as it toggles on, back and is dragged", () => {
    const onFill = readFill("rgb(52, 120, 246)");
    const offFill = readFill("rgb(200, 200, 205)");
    const travel = 32 / 14;
    const switchOf = (on: boolean): LiquidControl => ({
      radius: 14,
      originX: 116,
      originY: 66,
      travel,
      stops: [
        { target: 0, span: 0 },
        { target: travel, span: 0 },
      ],
      rings: [
        null,
        {
          box: { x: 100, y: 50, width: 64, height: 32, radius: 16 },
          cornerExponent: 2,
          color: on ? onFill : offFill,
        },
      ],
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: on ? onFill : offFill,
        least: { core: 0.72, edge: 0.5 },
        contrast: FROST_CONTRAST,
      },
      fill: { off: offFill, on: onFill },
      spread: 2,
    });
    const frames: unknown[] = [];
    const run = createRun(7, 3);
    let on = false;
    const step = (liquid: Liquid) => {
      const beads: LiquidBeadInstance[] = [];
      const laid = run(switchOf(on), liquid, beads);
      frames.push({
        instance: laid.instance,
        ring: laid.ring,
        animating: laid.animating,
        step: laid.step,
        seed: laid.seed,
        particles: [...laid.state.body.x, ...laid.state.body.y],
        beads,
      });
    };
    const rest = { drag: null, pressed: false, aim: 0 } as const;
    for (let i = 0; i < 10; i++) step({ ...rest, position: 0 });
    on = true;
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1, aim: 0.3 });
    on = false;
    for (let i = 0; i < 60; i++) step({ ...rest, position: 0, aim: -0.5 });
    for (let i = 0; i < 40; i++) {
      step({ ...rest, position: 0, pressed: true, drag: i / 40 });
    }
    on = true;
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1 });

    // Taken when the simulation moved to the GPU: the Switch's liquid must
    // not change.
    expect(
      createHash("sha256").update(JSON.stringify(frames)).digest("hex"),
    ).toBe("0912f971b6fc93fbc3e6f8452d5e7bd0d331a553b263a3bf3fc1f1b66328257f");
  });

  it("runs the ring light once for each landing on a segment", () => {
    const color = readFill("rgb(120, 80, 240)");
    const radius = 16;
    const segments = [0, 100, 200].map((left) => ({
      box: { x: left, y: 0, width: 100, height: 32, radius: 16 },
      cornerExponent: 2,
      color,
    }));
    const control: LiquidControl = {
      radius,
      originX: radius,
      originY: radius,
      travel: 300 / radius - 2,
      stops: segments.map(({ box }) => {
        const start = box.x / radius;
        const end = (box.x + box.width) / radius - 2;
        return { target: (start + end) / 2, span: (end - start) / 2 };
      }),
      rings: segments,
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: readFill("rgb(240, 240, 240)"),
        least: { core: 0.35, edge: 0.25 },
        contrast: { core: 1, edge: 1 },
      },
      fill: null,
      spread: 2,
    };
    const run = createRun(1, 0);
    const starts = new Map<number, number>();
    const step = (liquid: Liquid) => {
      const laid = run(control, liquid);
      if (laid.ring !== null) {
        starts.set(laid.ring.ring.start, laid.ring.box.x);
      }
    };
    const rest = { drag: null, pressed: false, aim: 0 } as const;
    for (let i = 0; i < 10; i++) step({ ...rest, position: 0 });
    // A press and hold on the last segment, and a release on it.
    for (let i = 0; i < 60; i++) step({ ...rest, position: 2, pressed: true });
    for (let i = 0; i < 90; i++) step({ ...rest, position: 2 });
    expect([...starts.values()]).toEqual([200]);

    // A press on the last segment, a drag to the middle one and a release.
    for (let i = 0; i < 30; i++) {
      step({ ...rest, position: 2, pressed: true, drag: 2 - i / 29 });
    }
    for (let i = 0; i < 90; i++) step({ ...rest, position: 1 });
    expect([...starts.values()]).toEqual([200, 100]);
  });
  it("runs the ring light on a short segment only when the liquid from a long one is in it", () => {
    const color = readFill("rgb(120, 80, 240)");
    const radius = 16;
    const segments = [
      [0, 200],
      [200, 32],
    ].map(([x, width]) => ({
      box: { x, y: 0, width, height: 32, radius: 16 },
      cornerExponent: 2,
      color,
    }));
    const stops = segments.map(({ box }) => {
      const start = box.x / radius;
      const end = (box.x + box.width) / radius - 2;
      return { target: (start + end) / 2, span: (end - start) / 2 };
    });
    const control: LiquidControl = {
      radius,
      originX: radius,
      originY: radius,
      travel: 232 / radius - 2,
      stops,
      rings: segments,
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: readFill("rgb(240, 240, 240)"),
        least: { core: 0.35, edge: 0.25 },
        contrast: { core: 1, edge: 1 },
      },
      fill: null,
      spread: 2,
    };
    const run = createRun(1, 0);
    const centresAtRing: number[] = [];
    let state: LiquidState | undefined;
    const step = (position: number) => {
      const laid = run(control, {
        position,
        drag: null,
        pressed: false,
        aim: 0,
      });
      if (laid.ring !== null && state?.ring === null) {
        centresAtRing.push(mean(laid.state.body.x));
      }
      state = laid.state;
    };
    for (let i = 0; i < 10; i++) step(0);
    for (let i = 0; i < 90; i++) step(1);

    expect(centresAtRing).toHaveLength(1);
    expect(centresAtRing[0]).toBeGreaterThanOrEqual(
      stops[1].target - stops[1].span - 1,
    );
  });

  it("puts a body back on the GPU at rest when its particles came back non-finite", () => {
    const color = readFill("rgb(120, 80, 240)");
    const radius = 16;
    const segments = [0, 70, 140, 210, 280].map((left) => ({
      box: { x: left, y: 0, width: 70, height: 32, radius: 16 },
      cornerExponent: 2,
      color,
    }));
    const stops = segments.map(({ box }) => {
      const start = box.x / radius;
      const end = (box.x + box.width) / radius - 2;
      return { target: (start + end) / 2, span: (end - start) / 2 };
    });
    const control: LiquidControl = {
      radius,
      originX: radius,
      originY: radius,
      travel: 350 / radius - 2,
      stops,
      rings: segments,
      frost: {
        color: readFill("rgb(255, 255, 255)"),
        under: readFill("rgb(240, 240, 240)"),
        least: { core: 0.35, edge: 0.25 },
        contrast: { core: 1, edge: 1 },
      },
      fill: null,
      spread: 2,
    };
    const rest = { drag: null, pressed: false, aim: 0 } as const;
    let state: LiquidState | undefined;
    let time = 0;
    const lay = (position: number, moved: LiquidSnapshot | null) => {
      time += 1 / 60;
      const laid = layoutLiquid(
        control,
        { id: 1, settings: { liquid: { ...rest, position } } },
        0,
        SLOT,
        state,
        { time, delta: 1 / 60, reducedMotion: false },
        BACKDROP,
        moved,
        [],
      );
      state = laid.state;
      return laid;
    };
    lay(0, null);
    const poured = lay(4, null);
    expect(poured.step).not.toBeNull();
    const count = poured.state.body.x.length;
    const lost: LiquidSnapshot = {
      particles: {
        x: new Float32Array(count).fill(Number.NaN),
        y: new Float32Array(count).fill(Number.NaN),
        vx: new Float32Array(count).fill(Number.NaN),
        vy: new Float32Array(count).fill(Number.NaN),
        from: 0,
        to: control.travel,
      },
      time: poured.state.simulated,
    };

    const recovered = lay(4, lost);

    expect(recovered.seed).toBe(true);
    expect(recovered.step).toBeNull();
    expect(recovered.state.body.settled).toBe(true);
    expect([...recovered.state.body.x].every(Number.isFinite)).toBe(true);
    expect(mean(recovered.state.body.x)).toBeCloseTo(stops[4].target, 1);
    expect(recovered.instance.calm).toBe(1);
    expect(recovered.instance.set).toBe(1);
    // The lost particles are older than the seed, so they are not read again.
    expect(lay(4, lost).seed).toBe(false);
    expect(state?.body.settled).toBe(true);
  });
});

describe("createControlReader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  const LIQUID = roleBits(["liquid"]);
  const AT_REST = { drag: null, pressed: false, aim: 0 };

  /**
   * A tracked segmented control with two segments, whose box reads are
   * counted in `segmentReads`.
   */
  function setUp({ fixed = false } = {}) {
    const observers = stubObservers();
    const track = document.createElement("div");
    if (fixed) {
      track.style.position = "fixed";
    }
    const indicator = document.createElement("div");
    indicator.setAttribute(LIQUID_INDICATOR, "");
    const segments = [0, 1].map(() => {
      const segment = document.createElement("div");
      segment.setAttribute(LIQUID_SEGMENT, "");
      return segment;
    });
    track.append(indicator, ...segments);
    document.body.append(track);
    const segmentReads: Element[] = [];
    const layOutSegments = (widths: readonly [number, number]) => {
      layOut(
        segments[0],
        { x: 0, y: 0, width: widths[0], height: 40 },
        segmentReads,
      );
      layOut(
        segments[1],
        { x: widths[0], y: 0, width: widths[1], height: 40 },
        segmentReads,
      );
      layOut(track, { x: 0, y: 0, width: widths[0] + widths[1], height: 40 });
    };
    layOutSegments([100, 100]);

    const registry = createEffectRegistry();
    let tracker: ElementTracker | null = null;
    registry.track((element) => {
      tracker = createElementTracker(element, () => {});
      return tracker;
    });
    const registration = registry.register(
      track,
      LIQUID,
      { liquid: { position: 0, ...AT_REST } },
      { scope: PAGE_SCOPE, holds: null },
    );
    const measure = () => {
      tracker?.measure(createMeasureContext());
    };
    measure();
    const changes: null[] = [];
    const controls = createControlReader(() => {
      changes.push(null);
    });
    const frame = (scrollY = 0) => {
      const [record] = registry.records(0, scrollY);
      const control = controls.read({ ...record, scopeIndex: 0 });
      controls.sweep();
      return control;
    };
    return {
      observers,
      segments,
      segmentReads,
      layOutSegments,
      registration,
      measure,
      frame,
      changes,
      controls,
    };
  }

  it("reads a control from the DOM once, and not again on frames where nothing changed", () => {
    const { segmentReads, frame } = setUp();
    const control = frame();
    expect(control?.stops).toHaveLength(2);
    expect(segmentReads).toHaveLength(2);
    expect(frame()).toBe(control);
    expect(frame()).toBe(control);
    expect(segmentReads).toHaveLength(2);
  });

  it("reads a segment that grows once its control is measured again", () => {
    const { segmentReads, layOutSegments, measure, frame } = setUp();
    const before = frame();
    layOutSegments([160, 100]);
    expect(frame()).toBe(before);
    measure();
    const after = frame();
    expect(segmentReads).toHaveLength(4);
    expect(after?.stops[0].span).toBeGreaterThan(before?.stops[0].span ?? 0);
    expect(after?.rings[1]?.box.x).toBe(160);
  });

  it("reads the control again after a segment changes size in a track that keeps its own", () => {
    const {
      observers,
      segments,
      segmentReads,
      layOutSegments,
      frame,
      changes,
    } = setUp();
    const before = frame();
    observers.resize(segments[0], 100, 40);
    observers.resize(segments[1], 100, 40);
    expect(changes).toHaveLength(0);
    expect(frame()).toBe(before);

    layOutSegments([140, 60]);
    observers.resize(segments[0], 140, 40);
    expect(changes).toHaveLength(1);
    const after = frame();
    expect(segmentReads).toHaveLength(4);
    expect(after?.rings[1]?.box.x).toBe(140);
  });

  it("stops watching the segments of a control that is no longer read", () => {
    const { observers, segments, frame, controls } = setUp();
    frame();
    expect(observers.resizeObserversOf(segments[0])).toBe(1);
    controls.sweep();
    expect(observers.resizeObserversOf(segments[0])).toBe(0);
  });

  it("reads the control again for a new position", () => {
    const { segmentReads, registration, frame } = setUp();
    frame();
    registration.update(
      LIQUID,
      { liquid: { position: 1, ...AT_REST } },
      PAGE_SCOPE,
    );
    frame();
    expect(segmentReads).toHaveLength(4);
  });

  it("reads a fixed control again where a scroll moves it in the page", () => {
    const { segmentReads, frame } = setUp({ fixed: true });
    const before = frame();
    const after = frame(300);
    expect(segmentReads).toHaveLength(4);
    expect((after?.originY ?? 0) - (before?.originY ?? 0)).toBe(300);
  });
});
