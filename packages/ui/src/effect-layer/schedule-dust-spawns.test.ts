import { describe, expect, it, vi } from "vitest";
import {
  createDustBursts,
  DUST_BURST_SPAWN,
  type DustEmitter,
} from "./schedule-dust-spawns.ts";

const emitter = (id: number, index: number, burst: number): DustEmitter => ({
  id,
  index,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  density: 0,
  burst,
});

describe("createDustBursts", () => {
  it("sheds each burst once, over as many frames as it needs", () => {
    const bursts = createDustBursts();
    const card = emitter(1, 3, 50);
    const done: number[] = [];
    const shed = [0, 1, 2].map((frame) =>
      bursts.take([card], 30, true, () => done.push(frame)),
    );
    expect(shed.map((spawns) => spawns.length)).toEqual([30, 20, 0]);
    expect(done).toEqual([1]);
    expect(shed.flat().every((spawn) => spawn === 3 + DUST_BURST_SPAWN)).toBe(
      true,
    );
  });

  it("sheds again only for a new registration", () => {
    const bursts = createDustBursts();
    bursts.take([emitter(1, 0, 5)], 64, true);
    expect(bursts.take([emitter(1, 0, 5)], 64, true)).toHaveLength(0);
    expect(bursts.take([emitter(2, 0, 5)], 64, true)).toHaveLength(5);
  });

  it("drops a burst that comes under reduced motion", () => {
    const bursts = createDustBursts();
    const done = vi.fn();
    bursts.take([emitter(1, 0, 5)], 64, false, done);
    expect(done).toHaveBeenCalledOnce();
    expect(bursts.take([emitter(1, 0, 5)], 64, true, done)).toHaveLength(0);
    expect(done).toHaveBeenCalledOnce();
  });
});
