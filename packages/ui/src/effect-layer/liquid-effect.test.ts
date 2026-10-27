import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss } from "@tuja/stylex-testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clockAt } from "../test-support/clock-at.ts";
import { mountSegmentTrack } from "../test-support/mount-segment-track.ts";
import { stubFrames } from "../test-support/stub-frames.ts";
import { stubObservers } from "../test-support/stub-observers.ts";
import { createEffectRegistry } from "./create-effect-registry.ts";
import { createFrameScheduler } from "./create-frame-scheduler.ts";
import { roleBits } from "./effect-roles.ts";
import {
  HAND_SECONDS,
  layoutLiquid,
  pillAt,
  type LiquidState,
} from "./liquid-effect.ts";
import type { LiquidControl } from "./liquid-reader.ts";
import type { LiquidBeadInstance } from "./liquid-wgsl.ts";
import { markEffectDrawn } from "./mark-effect-drawn.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { readFill } from "./read-element-box.ts";
import { PAGE_CARRIER } from "./resolve-carrier.ts";
import {
  liquidStep,
  mean,
  simulateLiquid,
  type LiquidParticles,
  type LiquidSnapshot,
} from "./step-liquid.ts";
import { trackElements } from "./track-elements.ts";
import type { EffectSettings } from "./types.ts";

type Liquid = NonNullable<EffectSettings["liquid"]>;

const SLOT = 2;
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
    spread: 2,
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
    spread: 2,
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
      path.join(here, "../forms/segment-track.stylex.ts"),
    ]);
    const fades = [...css.matchAll(/opacity (\d*\.?\d+)(ms|s)\b/g)].map(
      ([, value, unit]) => Number(value) / (unit === "ms" ? 1000 : 1),
    );
    expect(fades).toEqual([HAND_SECONDS]);
  });
});

/**
 * Lays one control's liquid out frame by frame, 60 a second, with the CPU
 * reference in the GPU's place: it runs each step the layout asks for, and
 * sends the particles back a frame later, as the GPU's readback does.
 */
function createRun(control: LiquidControl, reducedMotion = false) {
  const box = { x: 0, y: 0, width: 300, height: 2 * control.radius };
  let slot: LiquidParticles | null = null;
  let pending: LiquidSnapshot | null = null;
  let latest: LiquidSnapshot | null = null;
  let state: LiquidState | undefined;
  let time = 0;
  return (liquid: Liquid, moved?: LiquidSnapshot) => {
    time += 1 / 60;
    latest = moved ?? pending ?? latest;
    pending = null;
    const beads: LiquidBeadInstance[] = [];
    const laid = layoutLiquid(
      control,
      { id: 1, settings: { liquid }, ...box },
      0,
      SLOT,
      state,
      { time, delta: 1 / 60, reducedMotion },
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
    return { ...laid, beads, time };
  };
}

describe("layoutLiquid", () => {
  const rest = { drag: null, pressed: false } as const;

  /** Runs a move to `position` from rest, until nothing moves or `seconds` pass. */
  function move(control: LiquidControl, from: number, to: number, seconds = 4) {
    const run = createRun(control);
    let laid = run({ ...rest, position: from });
    for (let i = 0; i < 5; i++) laid = run({ ...rest, position: from });
    const before = laid;
    const frames = [run({ ...rest, position: to })];
    for (
      let i = 0;
      i < seconds * 60 && (frames.at(-1)?.animating ?? false);
      i++
    ) {
      frames.push(run({ ...rest, position: to }));
    }
    return { before, frames, start: frames[0].time - 1 / 60 };
  }

  /** The first frame on which the centre of the liquid's mass is in the target's pill. */
  const arrival = (
    frames: readonly {
      instance: { centreX: number; restX: number; span: number };
    }[],
  ) =>
    frames.findIndex(
      ({ instance }) =>
        Math.abs(instance.centreX - instance.restX) <= instance.span,
    );

  it("places the liquid at the control's box in the page", () => {
    const control = threeSegments();
    const { instance } = layoutLiquid(
      control,
      {
        id: 1,
        settings: { liquid: { ...rest, position: 0 } },
        x: 50,
        y: 500,
        width: 300,
        height: 32,
      },
      0,
      SLOT,
      undefined,
      { time: 0, delta: 1 / 60, reducedMotion: false },
      BACKDROP,
      null,
      [],
    );
    expect(instance.originX).toBe(50 + control.originX);
    expect(instance.originY).toBe(500 + control.originY);
  });

  it("draws a vertical track in its own frame, over the page where the track has no fill", () => {
    const run = createRun({
      ...threeSegments(),
      under: readFill("rgba(0, 0, 0, 0)"),
      vertical: true,
    });
    const { instance } = run({ ...rest, position: 0 });
    expect(instance.vertical).toBe(true);
    expect(instance.off).toEqual(BACKDROP.slice(0, 3));
  });

  it("lets the control draw the solid surface at rest, under a lit edge", () => {
    const { before } = move(threeSegments(), 0, 0, 0);
    expect(before.drawn).toBe(false);
    expect(before.animating).toBe(false);
    expect(before.step).toBeNull();
    expect(before.instance.body).toBe(0);
    expect(before.instance.edgeLit).toBe(1);
    expect(before.instance.calm).toBe(1);
  });

  it("pours a segment's liquid over as fast as the live site, lets it flow on after it arrives, and hands it back as the solid surface", () => {
    const { frames, start } = move(threeSegments(), 0, 2);
    expect(frames[0].drawn).toBe(true);
    expect(frames[0].step).not.toBeNull();
    // It melts into water as it leaves.
    expect(frames[10].instance.set).toBe(0);
    expect(frames.some(({ beads }) => beads.length > 0)).toBe(true);

    const arrivedAt = arrival(frames);
    const arrived = frames[arrivedAt];
    expect(arrived.time - start).toBeLessThan(0.45);
    // Its rim stays water while it lingers, with no lit edge.
    expect(frames[arrivedAt + 24].instance.set).toBeLessThanOrEqual(0.5);
    expect(frames[arrivedAt + 24].instance.edgeLit).toBe(0);
    expect(frames[arrivedAt + 24].instance.calm).toBeLessThan(0.5);

    const handedAt = frames.findIndex(({ drawn }) => !drawn);
    const handed = frames[handedAt];
    // It flows on for about 0.8 s.
    expect(handed.time - arrived.time).toBeGreaterThan(0.64);
    expect(handed.time - start).toBeLessThan(2);
    // The surface is the solid rest shape when the control takes it back.
    expect(handed.instance.set).toBe(1);
    expect(handed.instance.calm).toBe(1);
    expect(handed.instance.beadCount).toBe(0);
    expect(handed.instance.edgeLit).toBe(1);
    expect(handed.instance.body).toBe(1);

    const given = frames.find(({ instance }) => instance.body === 0);
    expect((given?.time ?? 0) - handed.time).toBeCloseTo(HAND_SECONDS, 1);
    const last = frames.at(-1);
    expect(last?.animating).toBe(false);
    expect(last?.instance.body).toBe(0);
  });

  it("lifts the glint as the lit edge comes back after a move, and fades it to the rest look", () => {
    const { frames } = move(threeSegments(), 0, 2);
    const glints = frames.map(({ instance }) => instance.glint);
    const peak = Math.max(...glints);
    expect(glints[0]).toBe(0);
    expect(peak).toBeGreaterThan(0.5);
    const melted = frames.findIndex(({ instance }) => instance.edgeLit === 0);
    const back = frames
      .slice(melted)
      .find(({ instance }) => instance.edgeLit > 0.5);
    expect(back?.instance.glint).toBe(peak);
    expect(glints.at(-1)).toBe(0);
    expect(frames.at(-1)?.animating).toBe(false);
  });

  it("toggles a Switch's thumb across, covers the track while it pours, and hands both back", () => {
    const { frames } = move(thumb(), 0, 1);
    expect(frames[0].instance.cover).toBe(true);
    expect(frames[0].instance.riseGoal).toBe(1);
    const last = frames.at(-1);
    expect(last?.drawn).toBe(false);
    expect(last?.animating).toBe(false);
    expect(last?.instance.cover).toBe(false);
    expect(last?.instance.rise).toBeCloseTo(1, 2);
    expect(last?.instance.restX).toBe(2 * 12);
  });

  it("melts a pressed thumb into water, and holds it there with no frame to follow", () => {
    const run = createRun(thumb());
    for (let i = 0; i < 3; i++) run({ ...rest, position: 0 });
    let held = run({ ...rest, position: 0, pressed: true });
    for (let i = 0; i < 60 && held.animating; i++) {
      held = run({ ...rest, position: 0, pressed: true });
    }
    expect(held.animating).toBe(false);
    expect(held.drawn).toBe(true);
    expect(held.instance.set).toBe(0);
    let released = run({ ...rest, position: 0 });
    for (let i = 0; i < 180 && released.animating; i++) {
      released = run({ ...rest, position: 0 });
    }
    expect(released.drawn).toBe(false);
    expect(released.instance.set).toBe(1);
  });

  it.each([
    ["a segmented control", threeSegments()],
    ["a Switch", thumb()],
  ])(
    "crossfades %s to its place under reduced motion, and then leaves the control to draw it",
    (_, control) => {
      const run = createRun(control, true);
      run({ ...rest, position: 0 });
      const first = run({ ...rest, position: 1 });
      expect(first.drawn).toBe(true);
      expect(first.fading).toBe(true);
      expect(first.step).toBeNull();
      expect(first.instance.restX).toBe(
        control.stops[1].target * control.radius,
      );
      expect(first.instance.leaving[0]).toBe(
        control.stops[0].target * control.radius,
      );

      const frames = [first];
      for (let i = 0; i < 30 && (frames.at(-1)?.fading ?? false); i++) {
        frames.push(run({ ...rest, position: 1 }));
      }
      expect(frames.every(({ instance }) => instance.glint === 0)).toBe(true);
      const midway = frames[Math.floor(HAND_SECONDS * 30)];
      expect(midway.instance.body).toBeGreaterThan(0.2);
      expect(midway.instance.leaving[2]).toBeGreaterThan(0.2);
      expect(midway.instance.body + midway.instance.leaving[2]).toBeCloseTo(
        1,
        5,
      );

      const last = frames.at(-1);
      expect((last?.time ?? 0) - first.time).toBeCloseTo(HAND_SECONDS, 1);
      expect(last?.fading).toBe(false);
      expect(last?.drawn).toBe(false);
      expect(last?.instance.body).toBe(0);
      expect(last?.instance.leaving[2]).toBe(0);
      expect(last?.instance.edgeLit).toBe(1);
    },
  );

  it("puts a body back on the GPU at rest when its particles came back non-finite", () => {
    const control = threeSegments();
    const run = createRun(control);
    run({ ...rest, position: 0 });
    const poured = run({ ...rest, position: 2 });
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
      time: poured.state.simulated + 1,
    };

    const recovered = run({ ...rest, position: 2 }, lost);

    expect(recovered.seed).toBe(true);
    expect(recovered.step).toBeNull();
    expect(recovered.state.body.settled).toBe(true);
    expect([...recovered.state.body.x].every(Number.isFinite)).toBe(true);
    expect(mean(recovered.state.body.x)).toBeCloseTo(
      control.stops[2].target,
      1,
    );
    expect(recovered.instance.calm).toBe(1);
    expect(recovered.instance.set).toBe(1);
  });
});

describe("layoutLiquid's step", () => {
  const rest = { drag: null, pressed: false } as const;
  const control = thumb();
  const box = { x: 0, y: 0, width: 48, height: 24 };
  const lay = (
    position: number,
    state: LiquidState | undefined,
    delta: number,
  ) =>
    layoutLiquid(
      control,
      { id: 1, settings: { liquid: { ...rest, position } }, ...box },
      0,
      SLOT,
      state,
      { time: 1, delta, reducedMotion: false },
      BACKDROP,
      null,
      [],
    );
  const pourAfter = (delta: number) =>
    lay(1, lay(0, undefined, 0).state, delta).step?.step;

  it("takes a 60th of a second on the first frame after the loop was idle", () => {
    expect(pourAfter(0)).toBe(liquidStep(1 / 60));
  });

  it("takes the whole of a frame that took twice a 30 Hz interval", () => {
    expect(pourAfter(1 / 15)).toBe(liquidStep(1 / 15));
    expect(pourAfter(1 / 15)).toBeCloseTo(2 * liquidStep(1 / 30), 10);
  });
});

describe("the liquid's frames", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("reads the segments of a clicked control only when the tracker measures it, and not in the frames of the pour", async () => {
    const frames = stubFrames();
    stubObservers();
    const { track, segments, segmentReads } = mountSegmentTrack();
    const registry = createEffectRegistry();
    const LIQUID = roleBits(["liquid"]);
    const settings = (position: number, pressed: boolean) => ({
      liquid: { position, drag: null, pressed },
    });
    const registration = registry.register(track, LIQUID, settings(0, false), {
      scope: PAGE_SCOPE,
      holds: null,
    });
    trackElements(registry, createFrameScheduler(vi.fn()), vi.fn(), () => 0);
    let state: LiquidState | undefined;
    let time = 0;
    let drawnFrames = 0;
    /** Runs a frame: the tracker's reads, then what the liquid's update does with the records. */
    const frame = async () => {
      frames.run();
      const [record] = registry.records(clockAt());
      const control = record.readings.liquid;
      if (control == null) {
        throw new Error("The control has no reading.");
      }
      const laid = layoutLiquid(
        control,
        record,
        0,
        SLOT,
        state,
        { time, delta: 1 / 60, reducedMotion: false },
        BACKDROP,
        null,
        [],
      );
      state = laid.state;
      time += 1 / 60;
      markEffectDrawn(track, laid.drawn);
      drawnFrames += laid.drawn ? 1 : 0;
      // The mark reaches the trackers in a microtask.
      await Promise.resolve();
    };
    await frame();
    expect(segmentReads).toHaveLength(2);

    segments[1].dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    registration.update(LIQUID, settings(0, true), PAGE_SCOPE, PAGE_CARRIER);
    await frame();
    segments[1].dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    registration.update(LIQUID, settings(1, false), PAGE_SCOPE, PAGE_CARRIER);
    await frame();
    expect(segmentReads).toHaveLength(6);

    for (let i = 0; i < 120; i++) {
      await frame();
    }
    expect(drawnFrames).toBeGreaterThan(0);
    expect(segmentReads).toHaveLength(6);
  });
});
