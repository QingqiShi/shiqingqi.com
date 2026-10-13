import { describe, expect, it } from "vitest";
import {
  beadRadius,
  finiteParticles,
  impactOn,
  leanTo,
  LIQUID_PHYSICS,
  liquidStep,
  MAX_PARTICLE_COUNT,
  MAX_SUBSTEPS,
  mean,
  PARTICLE_COUNT,
  particleCountFor,
  restingLiquid,
  scaleAfter,
  scaleFor,
  settleLiquid,
  settleOnSnapshot,
  simulateLiquid,
  stepLiquid,
  substepCount,
  type LiquidBody,
  type LiquidInput,
  type LiquidParticles,
} from "./step-liquid.ts";

/** A `md` Switch: the thumb's centre travels 2.2 rest radii. */
const TRAVEL = 2.2;
const FRAME = 1 / 60;
const ON: LiquidInput = {
  target: TRAVEL,
  span: 0,
  from: 0,
  to: TRAVEL,
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

describe("leanTo", () => {
  it("is tanh of the distance in tilt reaches, and keeps the argument where f32 tanh is 1 anyway", () => {
    const { TILT_REACH, LEAN_LIMIT } = LIQUID_PHYSICS;
    for (const away of [0, 0.1, -0.3, 1, -2.5, 7.9, -7.9, 8, 20, -30, 1e6]) {
      expect(leanTo(away)).toBe(Math.tanh(away / TILT_REACH));
    }
    expect(Math.tanh(LEAN_LIMIT)).toBe(1);
    expect(leanTo(Number.POSITIVE_INFINITY)).toBe(1);
    expect(leanTo(Number.NEGATIVE_INFINITY)).toBe(-1);
  });
});

describe("finiteParticles", () => {
  it("is false once any particle has a place or a speed that is not finite", () => {
    const body = restingLiquid(1);
    expect(finiteParticles(body)).toBe(true);
    const vy = new Float32Array(body.vy);
    vy[3] = Number.NaN;
    expect(finiteParticles({ ...body, vy })).toBe(false);
    const x = new Float32Array(body.x);
    x[0] = Number.POSITIVE_INFINITY;
    expect(finiteParticles({ ...body, x })).toBe(false);
  });
});

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

/**
 * An indicator's pour in a `md` segmented control, in rest radii: segments
 * 78, 72 and 100 px wide on a 16 px radius, from the first to the last.
 */
const SEGMENTS = [
  { start: 0, end: 2.875 },
  { start: 4.875, end: 7.375 },
  { start: 9.375, end: 13.625 },
] as const;
const restOf = ({ start, end }: { start: number; end: number }) => ({
  target: (start + end) / 2,
  span: (end - start) / 2,
});
const LAST = SEGMENTS[2];
const POUR_ON: LiquidInput = {
  ...restOf(LAST),
  from: 0,
  to: LAST.end,
  pressed: false,
  reducedMotion: false,
  aim: 0,
};
const firstPill = restOf(SEGMENTS[0]);
const pillPour = record(
  restingLiquid(firstPill.target, { span: firstPill.span }),
  POUR_ON,
  2,
);

describe("a pill's liquid", () => {
  it("fills the pill at rest, with more particles than a thumb's", () => {
    const body = restingLiquid(firstPill.target, { span: firstPill.span });
    expect(body.x.length).toBe(particleCountFor(firstPill.span));
    expect(body.x.length).toBeGreaterThan(PARTICLE_COUNT);
    expect(body.x.length).toBeLessThanOrEqual(MAX_PARTICLE_COUNT);
    expect(mean(body.x)).toBeCloseTo(firstPill.target, 1);
    expect(Math.min(...body.x)).toBeGreaterThan(SEGMENTS[0].start - 1);
    expect(Math.max(...body.x)).toBeLessThan(SEGMENTS[0].end + 1);
    expect(Math.min(...body.x)).toBeLessThan(SEGMENTS[0].start - 0.5);
    expect(Math.max(...body.x)).toBeGreaterThan(SEGMENTS[0].end + 0.5);
  });

  it("keeps a thumb's count and reach for a circle", () => {
    expect(particleCountFor(0)).toBe(PARTICLE_COUNT);
    expect(scaleFor(0, PARTICLE_COUNT)).toBe(1);
    expect(restingLiquid(0).scale).toBe(1);
  });

  it("spreads a capped count further apart to fill a longer pill", () => {
    expect(particleCountFor(10)).toBe(MAX_PARTICLE_COUNT);
    expect(scaleFor(10, MAX_PARTICLE_COUNT)).toBeGreaterThan(1);
    expect(scaleFor(0.25, particleCountFor(0.25))).toBeCloseTo(1, 2);
  });

  it("lands on the far end of the target's pill a little later than a thumb does", () => {
    const landedAt = firstTime(
      pillPour,
      (body) => impactOn(body, LAST.end) !== null,
    );
    expect(landedAt).not.toBeNull();
    expect(landedAt).toBeGreaterThan(0.2);
    expect(landedAt).toBeLessThan(0.36);
  });

  it("is frozen in the target's pill again within about as long as a thumb", () => {
    const frozenAt = firstTime(pillPour, (body) => body.set === 1, 0.1);
    expect(frozenAt).not.toBeNull();
    expect(frozenAt).toBeLessThan(0.65);
    const body = last(pillPour);
    expect(body.settled).toBe(true);
    expect(mean(body.x)).toBeCloseTo(POUR_ON.target, 0);
    expect(body.scale).toBeCloseTo(scaleFor(POUR_ON.span, body.x.length), 5);
  });

  it("keeps every particle between its walls", () => {
    let leftmost = Number.POSITIVE_INFINITY;
    let rightmost = Number.NEGATIVE_INFINITY;
    for (const { body } of pillPour) {
      for (let i = 0; i < body.x.length; i++) {
        leftmost = Math.min(leftmost, body.x[i]);
        rightmost = Math.max(rightmost, body.x[i]);
      }
    }
    expect(rightmost).toBeLessThan(LAST.end + 1);
    expect(leftmost).toBeGreaterThan(-1);
  });

  it("stretches only a little on the way, as one mass, not into a slab", () => {
    const length = (body: LiquidBody) =>
      Math.max(...body.x) - Math.min(...body.x);
    const atRest = length(last(pillPour));
    for (const { body } of pillPour) {
      expect(length(body)).toBeLessThan(atRest * 1.3);
    }
  });

  it("sheds beads along a pour across three segments, and no foam", () => {
    let most = 0;
    let shed = 0;
    let previous = 0;
    for (const { body } of pillPour) {
      most = Math.max(most, body.beads.length);
      shed += Math.max(0, body.beads.length - previous);
      previous = body.beads.length;
      for (const bead of body.beads) {
        expect(beadRadius(bead)).toBeLessThanOrEqual(0.38);
      }
    }
    expect(shed).toBeGreaterThanOrEqual(5);
    expect(most).toBeLessThanOrEqual(12);
  });

  it("does not count liquid past a wall that moved in behind it as landed on that wall", () => {
    const body = restingLiquid(firstPill.target, { span: firstPill.span });
    expect(impactOn(body, firstPill.target + 5, -1)).toBeNull();
    expect(impactOn(body, firstPill.target - 5, 1)).toBeNull();
  });

  it("pours back the other way and lands on the near end of the pill", () => {
    const first = SEGMENTS[0];
    const back = record(
      last(pillPour),
      {
        ...POUR_ON,
        ...restOf(first),
        from: first.start,
        to: LAST.end,
      },
      1,
    );
    const landedAt = firstTime(
      back,
      (body) => impactOn(body, first.start, -1) !== null,
    );
    expect(landedAt).not.toBeNull();
    expect(landedAt).toBeLessThan(0.36);
    expect(impactOn(back[0].body, first.start, -1)).toBeNull();
  });

  it("is on its way from the first frames, with no dead start", () => {
    const start = restingLiquid(firstPill.target, { span: firstPill.span });
    const first = stepLiquid(start, POUR_ON, FRAME);
    expect(mean(first.vx)).toBeGreaterThan(1);
    expect(mean(pillPour[2].body.x)).toBeGreaterThan(firstPill.target + 0.15);
  });

  it("moves a wall in only as the liquid leaves it, never through the liquid", () => {
    const body = restingLiquid(firstPill.target, {
      span: firstPill.span,
      from: 0,
      to: 20,
    });
    const front = Math.max(...body.x);
    const moved = stepLiquid(
      body,
      { ...POUR_ON, ...firstPill, from: 0, to: 0 },
      FRAME,
    );
    expect(moved.to).toBeGreaterThan(0);
    expect(moved.to).toBeLessThan(20);
    expect(Math.max(...moved.x)).toBeGreaterThan(front - 0.2);
  });
});

/**
 * A thumb's pour at commit 2f741354, which the user approved: the mean
 * position, the bead count, `calm` and `set` at fixed frames, for a `md`
 * Switch, the widest Switch (`sm`, 2.29) and a margin past it, aimed and
 * not, and for a toggle back in the middle of the pour. The pill's liquid
 * must not change any of it.
 */
const THUMB_POURS = [
  {
    travel: 2.2,
    aim: 0,
    pour: [
      [3, 0.15426, -0.00159, 1, 0.0, 0.55],
      [6, 0.53779, -0.00003, 2, 0.0, 0.1],
      [9, 1.12901, 0.00144, 4, 0.0, 0.0],
      [12, 1.88888, 0.00262, 5, 0.0, 0.0],
      [15, 2.37157, 0.00512, 5, 0.15, 0.15],
      [18, 2.28749, 0.00085, 5, 0.3, 0.3],
      [24, 2.10282, 0.0038, 5, 0.6, 0.6],
      [30, 2.17518, 0.0057, 0, 0.9, 0.9],
      [40, 2.19133, 0.00465, 0, 1.0, 1.0],
      [60, 2.19121, 0.00286, 0, 1.0, 1.0],
    ],
    back: [
      [3, 0.15426, -0.00159, 1, 0.0, 0.55],
      [6, 0.53779, -0.00003, 2, 0.0, 0.1],
      [9, 1.08952, 0.00144, 4, 0.0, 0.0],
      [12, 1.3718, 0.00263, 5, 0.0, 0.0],
      [15, 1.32065, 0.00356, 6, 0.0, 0.0],
      [18, 0.99385, 0.00426, 7, 0.0, 0.0],
      [24, -0.07215, 0.00524, 6, 0.1, 0.1],
      [30, 0.0068, -0.00035, 2, 0.4, 0.4],
      [40, 0.02038, 0.00257, 0, 0.9, 0.9],
      [60, 0.00733, 0.00184, 0, 1.0, 1.0],
    ],
  },
  {
    travel: 2.29,
    aim: 1,
    pour: [
      [3, 0.15438, 0.01143, 1, 0.0, 0.55],
      [6, 0.53851, 0.04601, 2, 0.0, 0.1],
      [9, 1.1258, 0.10525, 4, 0.0, 0.0],
      [12, 1.87458, 0.18051, 5, 0.0, 0.0],
      [15, 2.40228, 0.1933, 5, 0.15, 0.15],
      [18, 2.36049, 0.10297, 5, 0.3, 0.3],
      [24, 2.20687, 0.02873, 5, 0.6, 0.6],
      [30, 2.26641, 0.02115, 0, 0.9, 0.9],
      [40, 2.2785, 0.02161, 0, 1.0, 1.0],
      [60, 2.27783, 0.02336, 0, 1.0, 1.0],
    ],
    back: [
      [3, 0.15438, 0.01143, 1, 0.0, 0.55],
      [6, 0.53851, 0.04601, 2, 0.0, 0.1],
      [9, 1.08635, 0.10519, 4, 0.0, 0.0],
      [12, 1.36018, 0.18097, 4, 0.0, 0.0],
      [15, 1.30554, 0.26155, 5, 0.0, 0.0],
      [18, 0.99261, 0.32555, 6, 0.0, 0.0],
      [24, 0.06131, 0.30731, 6, 0.1, 0.1],
      [30, 0.02319, 0.11443, 3, 0.4, 0.4],
      [40, 0.01532, 0.06862, 0, 0.9, 0.9],
      [60, 0.01393, 0.06767, 0, 1.0, 1.0],
    ],
  },
  {
    travel: 2.5,
    aim: -1,
    pour: [
      [3, 0.15434, -0.01469, 1, 0.0, 0.55],
      [6, 0.53861, -0.04671, 2, 0.0, 0.1],
      [9, 1.12904, -0.10377, 4, 0.0, 0.0],
      [12, 1.89005, -0.17818, 6, 0.0, 0.0],
      [15, 2.56356, -0.21357, 6, 0.1, 0.1],
      [18, 2.60371, -0.12501, 6, 0.25, 0.25],
      [24, 2.411, -0.02584, 6, 0.55, 0.55],
      [30, 2.46915, -0.01369, 1, 0.85, 0.85],
      [40, 2.4901, -0.01515, 0, 1.0, 1.0],
      [60, 2.48921, -0.0181, 0, 1.0, 1.0],
    ],
    back: [
      [3, 0.15434, -0.01469, 1, 0.0, 0.55],
      [6, 0.53861, -0.04671, 2, 0.0, 0.1],
      [9, 1.08945, -0.1037, 4, 0.0, 0.0],
      [12, 1.36783, -0.1781, 5, 0.0, 0.0],
      [15, 1.31535, -0.25947, 6, 0.0, 0.0],
      [18, 1.00403, -0.32323, 7, 0.0, 0.0],
      [24, 0.06124, -0.30564, 7, 0.1, 0.1],
      [30, 0.02212, -0.11242, 2, 0.4, 0.4],
      [40, 0.01476, -0.06655, 0, 0.9, 0.9],
      [60, 0.01077, -0.06636, 0, 1.0, 1.0],
    ],
  },
] as const;

describe("a thumb's liquid, as the user approved it", () => {
  it.each(THUMB_POURS)(
    "pours over a travel of $travel aimed at $aim exactly as before",
    ({ travel, aim, pour, back }) => {
      const input: LiquidInput = { ...ON, target: travel, to: travel, aim };
      for (const [toggleBack, expected] of [
        [Number.POSITIVE_INFINITY, pour],
        [8, back],
      ] as const) {
        let body = restingLiquid(0);
        let at = 0;
        for (const [frame, x, y, beads, calm, set] of expected) {
          for (; at < frame; at++) {
            body = stepLiquid(
              body,
              at < toggleBack ? input : { ...input, target: 0 },
              FRAME,
            );
          }
          expect(mean(body.x)).toBeCloseTo(x, 5);
          expect(mean(body.y)).toBeCloseTo(y, 5);
          expect(body.beads).toHaveLength(beads);
          expect(body.calm).toBeCloseTo(calm, 5);
          expect(body.set).toBeCloseTo(set, 5);
        }
      }
    },
  );
});

describe("substepCount", () => {
  it("takes a substep for each 240th of a second, and at least one", () => {
    expect(substepCount(liquidStep(1 / 60), 0)).toBe(6);
    expect(substepCount(liquidStep(1 / 30), 0)).toBe(12);
    expect(substepCount(liquidStep(0.1), 0)).toBe(12);
    expect(substepCount(0.001, 0)).toBe(1);
  });

  it("takes more for a fast body, up to a limit", () => {
    expect(substepCount(liquidStep(1 / 60), 20)).toBe(7);
    expect(substepCount(liquidStep(1 / 60), 1000)).toBe(MAX_SUBSTEPS);
  });
});

/**
 * The GPU's place in the effect: the particles of each step come back a
 * frame late, and some frames bring none.
 */
function recordLate(
  start: LiquidBody,
  input: LiquidInput,
  seconds: number,
  lag: number,
  missing: (frame: number) => boolean,
) {
  const frames: Frame[] = [];
  let body = start;
  let moved: LiquidParticles = start;
  let simulated = 0;
  let particlesAt = 0;
  const pending: { particles: LiquidParticles; time: number; due: number }[] =
    [];
  for (let frame = 1; frame <= Math.round(seconds / FRAME); frame++) {
    const arrived = pending.filter(
      ({ due }) => due <= frame && !missing(frame),
    );
    const fresh = arrived.at(-1);
    for (const snapshot of arrived) {
      pending.splice(pending.indexOf(snapshot), 1);
    }
    ({ body, particlesAt } = settleOnSnapshot(
      body,
      fresh ?? null,
      particlesAt,
      input,
      FRAME,
    ));
    if (!body.settled) {
      const step = liquidStep(FRAME);
      moved = simulateLiquid(moved, input, body.scale, step);
      simulated += step;
      pending.push({ particles: moved, time: simulated, due: frame + lag });
    }
    frames.push({ body, time: frame * FRAME });
  }
  return frames;
}

describe("simulateLiquid and settleLiquid", () => {
  it("are the two halves of a step", () => {
    const body = last(within(pour, 0.2));
    const step = liquidStep(FRAME);
    const scale = scaleAfter(body.scale, ON.span, body.x.length, step);
    const moved = simulateLiquid(body, ON, scale, step);
    expect(settleLiquid(body, moved, ON, FRAME)).toEqual(
      stepLiquid(body, ON, FRAME),
    );
  });

  it("keeps the walls of the step for the beads, and gives them back", () => {
    const body = restingLiquid(firstPill.target, {
      span: firstPill.span,
      from: 0,
      to: 20,
    });
    const moved = simulateLiquid(
      body,
      { ...POUR_ON, ...firstPill, from: 0, to: 0 },
      body.scale,
      liquidStep(FRAME),
    );
    expect(moved.to).toBeGreaterThan(0);
    expect(moved.to).toBeLessThan(20);
    expect(
      settleLiquid(body, moved, { ...POUR_ON, ...firstPill }, FRAME).to,
    ).toBe(moved.to);
  });

  it("lets time pass with no new particles, and sheds nothing then", () => {
    const body = last(within(pour, 0.15));
    const still = settleLiquid(body, body, ON, FRAME, 0);
    expect(still.set).toBeLessThanOrEqual(body.set);
    expect(still.beads.length).toBeLessThanOrEqual(body.beads.length);
    expect(still.beads.every((bead) => bead.age > 0)).toBe(true);
    expect(still.x).toBe(body.x);
    expect(still.settled).toBe(false);
  });

  it("pours, lands, sheds and settles about as the reference does on particles a frame late", () => {
    const late = recordLate(restingLiquid(0), ON, 2.5, 1, () => false);
    const landedAt = firstTime(late, landed);
    const reference = firstTime(pour, landed);
    expect(landedAt).not.toBeNull();
    expect(Math.abs((landedAt ?? 0) - (reference ?? 0))).toBeLessThan(0.04);
    const shed = new Set(
      late.flatMap(({ body }) => body.beads.map((bead) => bead.life)),
    );
    expect(shed.size).toBeGreaterThanOrEqual(4);
    const settledAt = firstTime(late, (body) => body.settled);
    expect(settledAt).not.toBeNull();
    expect(settledAt).toBeLessThan(0.9);
    const body = last(late);
    expect(mean(body.x)).toBeCloseTo(TRAVEL, 1);
    expect(body.beads).toHaveLength(0);
  });

  it("carries on when the particles skip a frame and come two frames late", () => {
    const late = recordLate(
      restingLiquid(0),
      ON,
      2.5,
      2,
      (frame) => frame % 3 === 0,
    );
    const landedAt = firstTime(late, landed);
    expect(landedAt).not.toBeNull();
    expect(landedAt).toBeLessThan(0.5);
    for (const { body } of late) {
      for (const bead of body.beads) {
        expect(Math.abs(bead.vx)).toBeLessThan(20);
      }
    }
    const settledAt = firstTime(late, (body) => body.settled);
    expect(settledAt).not.toBeNull();
    expect(settledAt).toBeLessThan(1);
    expect(mean(last(late).x)).toBeCloseTo(TRAVEL, 1);
  });
});
