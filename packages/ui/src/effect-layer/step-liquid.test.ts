import { describe, expect, it } from "vitest";
import {
  beadRadius,
  impactOn,
  mean,
  PARTICLE_COUNT,
  restingLiquid,
  stepLiquid,
  type LiquidBody,
  type LiquidInput,
} from "./step-liquid.ts";

/** A `md` Switch: the thumb's centre travels 2.2 rest radii. */
const TRAVEL = 2.2;
const FRAME = 1 / 60;
const ON: LiquidInput = {
  target: TRAVEL,
  travel: TRAVEL,
  pressed: false,
  reducedMotion: false,
  aim: 0,
};
const OFF: LiquidInput = { ...ON, target: 0 };

interface Frame {
  readonly body: LiquidBody;
  readonly time: number;
}

function record(start: LiquidBody, input: LiquidInput, seconds: number) {
  const frames: Frame[] = [];
  let body = start;
  for (let frame = 1; frame <= Math.round(seconds / FRAME); frame++) {
    body = stepLiquid(body, input, FRAME);
    frames.push({ body, time: frame * FRAME });
  }
  return frames;
}

function within(trajectory: readonly Frame[], seconds: number) {
  return trajectory.slice(0, Math.round(seconds / FRAME));
}

function last(trajectory: readonly Frame[]) {
  return trajectory[trajectory.length - 1].body;
}

/** When `predicate` first holds, at `from` seconds or later. */
function firstTime(
  trajectory: readonly Frame[],
  predicate: (body: LiquidBody) => boolean,
  from = 0,
) {
  return (
    trajectory.find(({ body, time }) => time >= from && predicate(body))
      ?.time ?? null
  );
}

/** How far outside the track's inside the farthest particle is. */
function overflow(body: LiquidBody, travel: number) {
  let worst = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const nearX = Math.max(0, Math.min(travel, body.x[i]));
    worst = Math.max(worst, Math.hypot(body.x[i] - nearX, body.y[i]) - 1);
  }
  return worst;
}

const landed = (body: LiquidBody) => impactOn(body, TRAVEL) !== null;

/**
 * When the liquid first lands on the far end within a second, and where,
 * as degrees from the middle of the end, below it positive.
 */
function landing(trajectory: readonly Frame[]) {
  for (const { body, time } of within(trajectory, 1)) {
    const impact = impactOn(body, TRAVEL);
    if (impact !== null) {
      const angle = Math.atan2(impact.y, impact.x - TRAVEL);
      return { time, angle: (angle * 180) / Math.PI };
    }
  }
  throw new Error("The liquid did not land.");
}

const pour = record(restingLiquid(0), ON, 2.5);
const pourAimedUp = record(restingLiquid(0), { ...ON, aim: -1 }, 2);
const pourAimedDown = record(restingLiquid(0), { ...ON, aim: 1 }, 1);
const held = record(restingLiquid(0), { ...OFF, pressed: true }, 0.5);

describe("restingLiquid", () => {
  it("rests at the target as a disk inside the track, settled", () => {
    const body = restingLiquid(TRAVEL);
    expect(body.x).toHaveLength(PARTICLE_COUNT);
    expect(mean(body.x)).toBeCloseTo(TRAVEL, 1);
    expect(overflow(body, TRAVEL)).toBeLessThan(0);
    expect(body.settled).toBe(true);
    expect(body.calm).toBe(1);
    expect(body.set).toBe(1);
  });
});

describe("melting and setting", () => {
  it("melts while pressed, and sets again once released", () => {
    const meltedAt = firstTime(held, (body) => body.set === 0);
    expect(meltedAt).not.toBeNull();
    expect(meltedAt).toBeLessThan(0.2);
    const melted = last(held);
    expect(melted.set).toBe(0);
    expect(mean(melted.x)).toBeCloseTo(0, 1);
    const released = record(melted, OFF, 1);
    expect(released[0].body.settled).toBe(false);
    const setAt = firstTime(released, (body) => body.set === 1);
    expect(setAt).not.toBeNull();
    expect(setAt).toBeGreaterThan(0.1);
    expect(setAt).toBeLessThan(0.5);
    expect(last(released).settled).toBe(true);
  });

  it("rests melted while held, so no frame has to follow", () => {
    for (const { body } of held) {
      if (body.set > 0) {
        expect(body.settled).toBe(false);
      }
    }
    expect(last(held).settled).toBe(true);
  });

  it("melts as it pours and sets once it rests, and not before", () => {
    const meltedAt = firstTime(pour, (body) => body.set === 0);
    expect(meltedAt).not.toBeNull();
    for (const { body, time } of pour) {
      if (time >= (meltedAt ?? 0)) {
        // It draws into the circle and freezes as one change.
        expect(body.set).toBeCloseTo(body.calm, 5);
      }
      if (body.set > 0 && body.set < 1) {
        expect(body.settled).toBe(false);
      }
    }
    const setAt = firstTime(pour, (body) => body.set === 1, meltedAt ?? 0);
    expect(setAt).not.toBeNull();
    expect(pour.find(({ time }) => time === setAt)?.body.calm).toBe(1);
    expect(last(pour).set).toBe(1);
  });

  it("starts to round and freeze as it lands, not once it is still", () => {
    const trajectory = within(pour, 1);
    const landedAt = firstTime(trajectory, landed);
    expect(landedAt).not.toBeNull();
    const freezingAt = firstTime(
      trajectory,
      (body) => body.set > 0,
      landedAt ?? 0,
    );
    expect(freezingAt).not.toBeNull();
    expect(
      trajectory.find(({ time }) => time === freezingAt)?.body.calm,
    ).toBeGreaterThan(0);
    expect((freezingAt ?? 1) - (landedAt ?? 0)).toBeLessThan(0.05);
  });

  it("is solid at rest again well within a second of a toggle", () => {
    const settledAt = firstTime(within(pour, 2), (body) => body.settled);
    expect(settledAt).not.toBeNull();
    expect(settledAt).toBeLessThan(0.9);
  });
});

describe("stepLiquid", () => {
  it("keeps every particle, and keeps them all inside the track", () => {
    for (const { body } of within(pour, 2)) {
      expect(body.x).toHaveLength(PARTICLE_COUNT);
      expect(overflow(body, TRAVEL)).toBeLessThanOrEqual(1e-4);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        expect(Number.isFinite(body.x[i]) && Number.isFinite(body.y[i])).toBe(
          true,
        );
      }
    }
  });

  it("pours over and lands on the far end within half a second", () => {
    const landedAt = firstTime(within(pour, 1), landed);
    expect(landedAt).not.toBeNull();
    expect(landedAt).toBeGreaterThan(0.1);
    expect(landedAt).toBeLessThan(0.5);
  });

  it("keeps the front on the far end while the back sloshes, then settles", () => {
    const landedAt = firstTime(pour, landed);
    expect(landedAt).not.toBeNull();
    let backMin = Number.POSITIVE_INFINITY;
    let backMax = Number.NEGATIVE_INFINITY;
    for (const { body, time } of pour) {
      if (time < (landedAt ?? 0) || body.settled) {
        continue;
      }
      const back = Math.min(...body.x);
      const front = Math.max(...body.x);
      expect(front).toBeGreaterThan(TRAVEL + 0.8);
      backMin = Math.min(backMin, back);
      backMax = Math.max(backMax, back);
    }
    expect(backMax - backMin).toBeGreaterThan(0.2);
    const body = last(pour);
    expect(body.settled).toBe(true);
    expect(body.calm).toBe(1);
    expect(mean(body.x)).toBeCloseTo(TRAVEL, 1);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      expect(body.vx[i]).toBe(0);
      expect(body.vy[i]).toBe(0);
    }
  });

  it("is still again at rest, so no frame has to follow", () => {
    const rested = last(pour);
    const later = stepLiquid(rested, ON, FRAME);
    expect(later.settled).toBe(true);
    expect(mean(later.x)).toBeCloseTo(mean(rested.x), 2);
  });

  it("comes back the other way", () => {
    const off = last(record(last(pour), OFF, 2.5));
    expect(off.settled).toBe(true);
    expect(mean(off.x)).toBeCloseTo(0, 1);
  });

  it("sheds beads that fall behind it on the way and catch up as it lands", () => {
    const shed = new Set<number>();
    const lastX = new Map<number, number>();
    let behind = 0;
    let previous = mean(restingLiquid(0).x);
    for (const { body } of within(pour, 1)) {
      const centre = mean(body.x);
      const bodyMoved = centre - previous;
      previous = centre;
      for (const bead of body.beads) {
        expect(Math.abs(bead.y) + beadRadius(bead)).toBeLessThanOrEqual(
          1 + 1e-6,
        );
        expect(bead.x).toBeGreaterThan(-1);
        expect(bead.x).toBeLessThan(TRAVEL + 1);
        shed.add(bead.life);
        // A bead never stops: it moves on towards the target every frame.
        const before = lastX.get(bead.life);
        if (before !== undefined) {
          expect(bead.x).toBeGreaterThan(before);
          if (bead.free && bead.x - before < bodyMoved) {
            behind++;
          }
        }
        lastX.set(bead.life, bead.x);
      }
      if (body.set === 1) {
        expect(body.beads).toHaveLength(0);
      }
    }
    expect(shed.size).toBeGreaterThanOrEqual(4);
    expect(behind).toBeGreaterThan(0);
  });

  it("swells each bead out of the body, and pinches it off", () => {
    const shed = new Map<number, { x: number; y: number }>();
    let freed = 0;
    let body = restingLiquid(0);
    for (const { body: next } of within(pour, 0.4)) {
      for (const bead of next.beads) {
        const key = bead.life;
        if (!shed.has(key) && !body.beads.some((old) => old.life === key)) {
          // A new bead starts at a particle, inside the body, at no size.
          expect(beadRadius({ ...bead, age: 0 })).toBe(0);
          const at = Array.from(next.x).findIndex(
            (x, i) => x === bead.x && next.y[i] === bead.y,
          );
          expect(at).toBeGreaterThanOrEqual(0);
          shed.set(key, bead);
        }
      }
      freed = Math.max(freed, next.beads.filter((bead) => bead.free).length);
      body = next;
    }
    expect(shed.size).toBeGreaterThanOrEqual(4);
    expect(freed).toBeGreaterThanOrEqual(2);
  });

  it("lands on the middle of the far end with no aim", () => {
    const { angle } = landing(pour);
    expect(Math.abs(angle)).toBeLessThan(10);
  });

  it("lands higher or lower on the far end as it is aimed, at the same time", () => {
    const centre = landing(pour);
    const top = landing(pourAimedUp);
    const bottom = landing(pourAimedDown);
    expect(top.angle).toBeLessThan(-30);
    expect(bottom.angle).toBeGreaterThan(30);
    expect(Math.abs(top.time - centre.time)).toBeLessThan(0.04);
    expect(Math.abs(bottom.time - centre.time)).toBeLessThan(0.04);
  });

  it("leans only a little across as it is aimed, and rests on the centre line", () => {
    const lean = Math.max(
      ...pourAimedUp.map(({ body }) => Math.abs(mean(body.y))),
    );
    expect(lean).toBeLessThan(0.25);
    const body = last(pourAimedUp);
    expect(body.settled).toBe(true);
    expect(Math.abs(mean(body.y))).toBeLessThan(0.05);
  });

  it("goes straight to the target under reduced motion, shedding nothing", () => {
    const body = stepLiquid(
      last(within(pour, 0.1)),
      { ...ON, reducedMotion: true },
      FRAME,
    );
    expect(body.settled).toBe(true);
    expect(mean(body.x)).toBeCloseTo(TRAVEL, 1);
    expect(body.beads).toHaveLength(0);
  });
});
