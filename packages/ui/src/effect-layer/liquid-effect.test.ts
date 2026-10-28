import { describe, expect, it } from "vitest";
import { layoutLiquid, type LiquidState } from "./liquid-effect.ts";
import type { LiquidControl } from "./liquid-reader.ts";
import type { LiquidBeadInstance } from "./liquid-wgsl.ts";
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
