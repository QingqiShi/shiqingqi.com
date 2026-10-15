import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss } from "@tuja/stylex-testing";
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
import {
  createControlReader,
  HAND_SECONDS,
  layoutLiquid,
  pillAt,
  readEdge,
  readInsetRing,
  type LiquidContext,
  type LiquidControl,
  type LiquidState,
  type PixelCount,
} from "./liquid-effect.ts";
import { LIQUID_INDICATOR, LIQUID_SEGMENT } from "./liquid-indicator.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { readFill } from "./read-element-box.ts";
import { PILL_MOTION } from "./step-pill.ts";
import {
  LIFETIME_VARY,
  MAX_PIXELS,
  PIXEL_FLOATS,
  SHED_LIFETIME,
  speedShare,
  stepPixels,
} from "./step-pixels.ts";
import type { EffectSettings } from "./types.ts";

type Liquid = NonNullable<EffectSettings["liquid"]>;

const BACKDROP = readFill("rgb(250, 250, 250)");

/** A segmented control of three segments, each 100 wide. */
function threeSegments(): LiquidControl {
  const radius = 16;
  return {
    radius,
    originX: radius,
    originY: radius,
    travel: 300 / radius - 2,
    stops: [0, 100, 200].map((left) => {
      const start = left / radius;
      const end = (left + 100) / radius - 2;
      return { target: (start + end) / 2, span: (end - start) / 2 };
    }),
    color: readFill("rgb(255, 255, 255)"),
    under: readFill("rgb(240, 240, 240)"),
    fill: null,
    ring: null,
    thumb: false,
    edge: [0.08, 0.06, 0.06, 0],
    accent: readFill("rgb(120, 80, 240)"),
  };
}

/** A Switch's thumb, 12 px in radius, with a travel of two radii. */
function thumb(): LiquidControl {
  const off = readFill("rgb(120, 120, 128)");
  const on = readFill("rgb(120, 80, 240)");
  const white = readFill("rgb(255, 255, 255)");
  return {
    radius: 12,
    originX: 12,
    originY: 12,
    travel: 2,
    stops: [
      { target: 0, span: 0 },
      { target: 2, span: 0 },
    ],
    color: white,
    under: off,
    fill: { off, on },
    ring: { off: readFill("rgb(140, 140, 148)"), on, width: 1 },
    thumb: true,
    edge: [0.06, 0.18, 0.12, 0],
    accent: white,
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

describe("HAND_SECONDS", () => {
  it("is as long as the segment indicator takes to fade back in", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const css = compileStylexCss([
      path.join(here, "hand-back.stylex.ts"),
      path.join(here, "../forms/segment-indicator.stylex.ts"),
    ]);
    const fades = [...css.matchAll(/opacity (\d*\.?\d+)(ms|s)\b/g)].map(
      ([, value, unit]) => Number(value) / (unit === "ms" ? 1000 : 1),
    );
    expect(fades).toEqual([HAND_SECONDS]);
  });
});

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

describe("createControlReader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  const LIQUID = roleBits(["liquid"]);
  const AT_REST = { drag: null, pressed: false };

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
      tracker?.measure(createMeasureContext(() => 0));
    };
    measure();
    const changes: null[] = [];
    const controls = createControlReader(() => {
      changes.push(null);
    });
    const frame = (scrollY = 0) => {
      const [record] = registry.records(0, scrollY, () => 0);
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

  /** Where the second segment starts, in px from the start of the track. */
  const secondStart = (control: LiquidControl | null) =>
    control === null
      ? Number.NaN
      : (control.stops[1].target - control.stops[1].span) * control.radius;

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
    expect(secondStart(after)).toBeCloseTo(160, 6);
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
    expect(secondStart(after)).toBeCloseTo(140, 6);
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

describe("layoutLiquid", () => {
  const rest = { drag: null, pressed: false } as const;
  const CONTEXT: LiquidContext = {
    pointer: {
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      pressed: false,
      present: false,
    },
    hoverable: false,
    viewport: { x: 0, y: 0, width: 800, height: 600 },
    pixelRatio: 2,
  };

  /**
   * Lays one control out frame by frame with the CPU reference in the
   * GPU's place: it runs each step on a pixel buffer of its own, and sends
   * the count of pixels away back a frame later.
   */
  function createRun(reducedMotion = false, control = threeSegments()) {
    const buffer = new Float32Array(MAX_PIXELS * PIXEL_FLOATS);
    const box = { x: 0, y: 0, width: 300, height: 2 * control.radius };
    let state: LiquidState | undefined;
    let pending: PixelCount | null = null;
    let counted: PixelCount | null = null;
    let time = 0;
    return (liquid: Liquid) => {
      time += 1 / 60;
      counted = pending ?? counted;
      pending = null;
      const laid = layoutLiquid(
        control,
        { id: 1, settings: { liquid }, ...box },
        0,
        state,
        { time, delta: 1 / 60, reducedMotion },
        BACKDROP,
        CONTEXT,
        { counted, offset: () => 0 },
      );
      const work = laid.pixels;
      if (work.step !== null) {
        const moving = stepPixels(
          buffer,
          work.step.grid,
          work.step,
          work.step.delta,
        );
        pending = {
          generation: work.generation,
          tick: work.step.tick,
          moving,
        };
      }
      state = laid.state;
      return { ...laid, time, moving: pending?.moving ?? 0 };
    };
  }

  /** Where the pill's centre is drawn, in px, and its stretch along the track. */
  const pillOf = (laid: { instance: { pill: readonly number[] } }) => ({
    x: laid.instance.pill[0],
    stretch: laid.instance.pill[2],
  });

  it("winds the pill up away from a pressed segment, lands it a little past its place, hands it back once it is whole, and draws its shed pixels until they die", () => {
    const run = createRun();
    let laid = run({ ...rest, position: 0 });
    for (let i = 0; i < 5; i++) laid = run({ ...rest, position: 0 });
    expect(laid.drawn).toBe(false);
    expect(laid.pixels.step).toBeNull();
    const start = pillOf(laid).x;
    const goal = threeSegments().stops[1].target * threeSegments().radius;
    const frames = [];
    for (let i = 0; i < 4; i++) {
      frames.push(run({ ...rest, position: 1, pressed: true }));
    }
    for (let i = 0; i < 60; i++) frames.push(run({ ...rest, position: 1 }));
    const pressedAt = frames[0].time - 1 / 60;
    expect(frames[0].drawn).toBe(true);

    const windUp = frames.filter(
      ({ time }) => time - pressedAt <= PILL_MOTION.windUp.seconds.pointer,
    );
    const back = Math.min(...windUp.map((frame) => pillOf(frame).x)) - start;
    expect(back).toBeLessThan(-1);
    expect(back).toBeGreaterThan(-PILL_MOTION.windUp.depth.pill);

    const over = Math.max(...frames.map((frame) => pillOf(frame).x)) - goal;
    expect(over).toBeGreaterThan(0.5);
    expect(over).toBeLessThan(4);
    expect(Math.max(...frames.map(({ moving }) => moving))).toBeGreaterThan(0);
    expect(
      Math.max(...frames.map(({ instance }) => instance.motion[0])),
    ).toBeGreaterThan(5);

    const handedAt = frames.findIndex(({ drawn }) => !drawn);
    const handed = frames[handedAt];
    // The pill is whole before the control takes over, and its shed pixels
    // draw on over the control's own.
    expect(handed.moving).toBe(0);
    expect(handed.pixels.draw).not.toBeNull();
    expect(handed.time - pressedAt).toBeLessThan(0.32);
    const gone = frames.find(({ instance }) => instance.body === 0);
    expect((gone?.time ?? 1) - handed.time).toBeCloseTo(HAND_SECONDS, 1);
    const lastShed = frames.findLast(
      ({ pixels }) => pixels.step !== null && speedShare(pixels.step.speed) > 0,
    );
    const stopped = frames.find(
      ({ time, animating }) => time > handed.time && !animating,
    );
    expect(stopped?.pixels.draw).toBeNull();
    expect((stopped?.time ?? 1) - (lastShed?.time ?? 0)).toBeLessThanOrEqual(
      SHED_LIFETIME * (1 + LIFETIME_VARY) + 3.5 / 60,
    );
    expect(frames.at(-1)?.animating).toBe(false);
    expect(pillOf(frames.at(-1) ?? laid).x).toBeCloseTo(goal, 1);
  });

  it("sweeps one glint along the edge as the pill lands, and then draws nothing that moves", () => {
    const run = createRun();
    run({ ...rest, position: 0 });
    const sweeps: number[] = [];
    let laid = run({ ...rest, position: 2 });
    for (let i = 0; i < 90 && laid.animating; i++) {
      laid = run({ ...rest, position: 2 });
      if (laid.instance.motion[3] > 0) {
        sweeps.push(laid.time);
      }
    }
    expect(sweeps.length).toBeGreaterThan(5);
    // One sweep: its frames follow each other.
    expect((sweeps.at(-1) ?? 0) - sweeps[0]).toBeLessThan(
      sweeps.length / 60 + 0.01,
    );
    expect(laid.animating).toBe(false);
    expect(laid.instance.motion).toEqual([0, 0, 0, 0]);
    expect(laid.instance.edgeLit).toBe(1);
  });

  it("makes the edge whole on the frame the pill arrives at its place from a jump, though it still moves fast", () => {
    const run = createRun();
    run({ ...rest, position: 0 });
    const goal = threeSegments().stops[2].target * threeSegments().radius;
    const frames = [run({ ...rest, position: 2 })];
    for (let i = 0; i < 30; i++) frames.push(run({ ...rest, position: 2 }));
    const landedAt = frames.findIndex(
      (frame, i) =>
        i > 0 && frames[i - 1].state.travelling && !frame.state.travelling,
    );
    const landed = frames[landedAt];
    const arrival = goal - PILL_MOTION.land;
    expect(pillOf(frames[landedAt - 1]).x).toBeLessThan(arrival);
    expect(pillOf(landed).x).toBeGreaterThan(arrival);
    expect(frames[landedAt - 1].moving).toBeGreaterThan(0);
    const speed = (landed.state.pill?.x.speed ?? 0) * threeSegments().radius;
    expect(speedShare(speed)).toBeGreaterThan(0);
    expect(landed.pixels.step?.speed).toBe(0);
    expect(landed.moving).toBe(0);
    expect(landed.instance.motion[3]).toBe(0);
    expect(frames[landedAt + 1].instance.motion[3]).toBeGreaterThan(0);
  });

  it("leans the thumb away from the other end while it is pressed, and launches it on the release with no second wind-up", () => {
    const run = createRun(false, thumb());
    for (let i = 0; i < 3; i++) run({ ...rest, position: 0 });
    let held = run({ ...rest, position: 0, pressed: true });
    for (let i = 0; i < 6; i++) {
      held = run({ ...rest, position: 0, pressed: true });
    }
    expect(held.drawn).toBe(true);
    // The lean holds still, with no frame to follow, while the press lasts.
    for (let i = 0; i < 30 && held.animating; i++) {
      held = run({ ...rest, position: 0, pressed: true });
    }
    expect(held.animating).toBe(false);
    expect(held.drawn).toBe(true);
    expect(pillOf(held).x).toBeLessThan(-1);
    expect(pillOf(held).x).toBeGreaterThan(-PILL_MOTION.windUp.depth.thumb);
    expect(pillOf(held).stretch).toBeLessThan(0.99);
    let previous = pillOf(held).x;
    let laid = run({ ...rest, position: 1 });
    expect(pillOf(laid).x).toBeGreaterThan(previous);
    while (pillOf(laid).x > previous) {
      previous = pillOf(laid).x;
      laid = run({ ...rest, position: 1 });
    }
    // It turned back only past its place.
    expect(previous).toBeGreaterThan(2 * 12);
    for (let i = 0; i < 60 && laid.animating; i++) {
      laid = run({ ...rest, position: 1 });
    }
    expect(laid.animating).toBe(false);
    expect(laid.drawn).toBe(false);
  });

  it("winds up for less time on a key than on a press", () => {
    const leanFrames = (pressed: boolean) => {
      const run = createRun();
      let laid = run({ ...rest, position: 0 });
      const start = pillOf(laid).x;
      let frames = 0;
      for (let i = 0; i < 12; i++) {
        laid = run({ ...rest, position: 1, pressed: pressed && i < 4 });
        frames += pillOf(laid).x < start ? 1 : 0;
      }
      return frames;
    };
    expect(leanFrames(false)).toBeGreaterThan(0);
    expect(leanFrames(false)).toBeLessThan(leanFrames(true));
  });

  it("drags the pill with no wind-up on the release, sheds as the finger flicks it, and rests once its shed pixels have died", () => {
    const run = createRun();
    run({ ...rest, position: 0 });
    let moving = 0;
    for (let i = 0; i <= 6; i++) {
      const laid = run({ ...rest, position: 0, pressed: true, drag: i / 3 });
      moving = Math.max(moving, laid.moving);
    }
    let laid = run({ ...rest, position: 2 });
    let least = pillOf(laid).x;
    const released = least;
    for (let i = 0; i < 60 && laid.animating; i++) {
      laid = run({ ...rest, position: 2 });
      moving = Math.max(moving, laid.moving);
      least = Math.min(least, pillOf(laid).x);
    }
    expect(least).toBeGreaterThanOrEqual(released - 0.5);
    expect(moving).toBeGreaterThan(0);
    expect(laid.animating).toBe(false);
    expect(laid.drawn).toBe(false);
  });

  it.each([
    ["a segmented control", threeSegments()],
    ["a Switch", thumb()],
  ])(
    "fades %s from one pill to the next under reduced motion, with no pixels and no blur",
    (_, control) => {
      const run = createRun(true, control);
      run({ ...rest, position: 0 });
      const start = run({ ...rest, position: 1 });
      expect(start.fading).toBe(true);
      expect(start.drawn).toBe(true);
      expect(start.pixels.step).toBeNull();
      expect(start.instance.leaving[2]).toBeGreaterThan(0.9);
      let laid = start;
      while (laid.fading) {
        laid = run({ ...rest, position: 1 });
        expect(laid.instance.motion[0]).toBe(0);
      }
      expect(laid.time - start.time).toBeCloseTo(0.15, 1);
      expect(laid.drawn).toBe(false);
      expect(laid.animating).toBe(false);
      // The lit edge's light stays put.
      expect(laid.instance.light).toEqual(start.instance.light);
    },
  );
});
