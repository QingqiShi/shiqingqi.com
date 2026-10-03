import { describe, expect, it } from "vitest";
import {
  createLiveSlots,
  DUST_MAX_LIFE,
  DUST_MAX_SPAWNS_PER_FRAME,
  DUST_PARTICLE_BUDGET,
  emissionRate,
  isShedding,
  scheduleDustSpawns,
  type DustEmitter,
  type DustFan,
} from "./schedule-dust-spawns.ts";
import type { EffectPointer } from "./types.ts";

const VIEWPORT = { x: 0, y: 1000, width: 1200, height: 800 };
const NO_POINTER: EffectPointer = {
  x: 0,
  y: 0,
  velocityX: 0,
  velocityY: 0,
  pressed: false,
  present: false,
};

function emitter(overrides: Partial<DustEmitter> = {}): DustEmitter {
  return {
    id: 1,
    index: 0,
    x: 100,
    y: 1200,
    width: 200,
    height: 100,
    density: 2,
    ...overrides,
  };
}

function fan(overrides: Partial<DustFan> = {}): DustFan {
  return {
    id: 9,
    x: 600,
    y: 1200,
    width: 100,
    height: 100,
    reach: 400,
    ...overrides,
  };
}

describe("isShedding", () => {
  it("sheds in the viewport and within a quarter of its height", () => {
    expect(isShedding(emitter(), [], VIEWPORT)).toBe(true);
    expect(isShedding(emitter({ y: 1850 }), [], VIEWPORT)).toBe(true);
    expect(isShedding(emitter({ y: 750 }), [], VIEWPORT)).toBe(true);
  });

  it("does not shed further away", () => {
    expect(isShedding(emitter({ y: 2100 }), [], VIEWPORT)).toBe(false);
    expect(isShedding(emitter({ y: 500 }), [], VIEWPORT)).toBe(false);
  });

  it("sheds off screen while a fan on screen pulls from as far as it", () => {
    const below = emitter({ y: 2400 });
    expect(isShedding(below, [fan({ y: 1600, reach: 800 })], VIEWPORT)).toBe(
      true,
    );
    expect(isShedding(below, [fan({ y: 1600, reach: 500 })], VIEWPORT)).toBe(
      false,
    );
    expect(isShedding(below, [fan({ y: 2300, reach: 800 })], VIEWPORT)).toBe(
      false,
    );
  });

  it("does not count an element pulling at its own dust", () => {
    const below = emitter({ y: 2400 });
    expect(
      isShedding(below, [fan({ id: 1, y: 1600, reach: 2000 })], VIEWPORT),
    ).toBe(false);
  });
});

describe("emissionRate", () => {
  it("sheds its density along every 100 px of its edge", () => {
    expect(emissionRate(emitter(), [], NO_POINTER)).toBeCloseTo(12, 6);
  });

  it("sheds more the closer a fan pulls at it", () => {
    const base = emissionRate(emitter(), [], NO_POINTER);
    expect(emissionRate(emitter(), [fan({ x: 300 })], NO_POINTER)).toBeCloseTo(
      base * 4,
      6,
    );
    expect(emissionRate(emitter(), [fan({ x: 500 })], NO_POINTER)).toBeCloseTo(
      base * 2.5,
      6,
    );
    expect(emissionRate(emitter(), [fan({ x: 700 })], NO_POINTER)).toBeCloseTo(
      base,
      6,
    );
    expect(
      emissionRate(emitter(), [fan({ id: 1, x: 300 })], NO_POINTER),
    ).toBeCloseTo(base, 6);
  });

  it("sheds more under a pointer, the most when it moves fast", () => {
    const base = emissionRate(emitter(), [], NO_POINTER);
    const over = { ...NO_POINTER, x: 150, y: 1250, present: true };
    expect(emissionRate(emitter(), [], over)).toBeCloseTo(base * 1.5, 6);
    expect(
      emissionRate(emitter(), [], { ...over, velocityX: 2000 }),
    ).toBeCloseTo(base * 4, 6);
    expect(
      emissionRate(emitter(), [], { ...over, x: 900, velocityX: 2000 }),
    ).toBeCloseTo(base, 6);
  });
});

describe("scheduleDustSpawns", () => {
  it("carries a fraction of a particle to the next frame", () => {
    const carried = new Map<number, number>();
    const emitters = [emitter()];
    expect(scheduleDustSpawns(emitters, [45], 1 / 60, carried)).toEqual([]);
    expect(scheduleDustSpawns(emitters, [45], 1 / 60, carried)).toEqual([0]);
    expect(carried.get(1)).toBeCloseTo(0.5, 6);
  });

  it("takes turns between emitters", () => {
    const emitters = [emitter(), emitter({ id: 2, index: 3 })];
    expect(scheduleDustSpawns(emitters, [3, 1], 1, new Map())).toEqual([
      0, 3, 0, 0,
    ]);
  });

  it("sheds less from every emitter when together they pass the budget", () => {
    const emitters = [emitter(), emitter({ id: 2, index: 1 })];
    const budget = DUST_PARTICLE_BUDGET / DUST_MAX_LIFE;
    const spawns = scheduleDustSpawns(
      emitters,
      [budget * 3, budget],
      0.1,
      new Map(),
    );
    const first = spawns.filter((index) => index === 0).length;
    const second = spawns.filter((index) => index === 1).length;
    expect(first + second).toBeLessThanOrEqual(Math.ceil(budget * 0.1));
    expect(first / second).toBeCloseTo(3, 0);
  });

  it("sheds at most one spawn list a frame", () => {
    expect(scheduleDustSpawns([emitter()], [1e6], 1, new Map())).toHaveLength(
      DUST_MAX_SPAWNS_PER_FRAME,
    );
  });

  it("forgets an emitter once it is gone", () => {
    const carried = new Map([[7, 0.9]]);
    scheduleDustSpawns([emitter()], [1], 0.1, carried);
    expect([...carried.keys()]).toEqual([1]);
  });
});

describe("createLiveSlots", () => {
  it("holds the slots shed within the longest life, oldest first", () => {
    const slots = createLiveSlots();
    expect(slots.advance(0.1, 10)).toEqual({ start: 0, length: 10 });
    expect(slots.advance(0.1, 5)).toEqual({ start: 0, length: 15 });
    expect(slots.advance(DUST_MAX_LIFE - 0.1, 0)).toEqual({
      start: 10,
      length: 5,
    });
    expect(slots.advance(0.1, 0)).toEqual({ start: 15, length: 0 });
  });

  it("goes round the ring", () => {
    const slots = createLiveSlots();
    slots.advance(0.1, DUST_PARTICLE_BUDGET - 2);
    expect(slots.advance(0.1, 6)).toEqual({
      start: 4,
      length: DUST_PARTICLE_BUDGET,
    });
    expect(slots.advance(DUST_MAX_LIFE - 0.1, 0)).toEqual({
      start: DUST_PARTICLE_BUDGET - 2,
      length: 6,
    });
  });

  it("forgets every particle once cleared", () => {
    const slots = createLiveSlots();
    slots.advance(0.1, 10);
    slots.clear();
    expect(slots.advance(0.1, 3)).toEqual({ start: 10, length: 3 });
  });
});
