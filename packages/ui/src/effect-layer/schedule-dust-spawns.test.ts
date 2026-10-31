import { describe, expect, it } from "vitest";
import {
  createDustBursts,
  DUST_BURST_SPAWN,
  type DustEmitter,
} from "./schedule-dust-spawns.ts";

/** A 100 x 150 px emitter, 500 px round its edge, shaken `shakes` times. */
const emitter = (shakes: number, burst = 10): DustEmitter => ({
  id: 1,
  index: 3,
  x: 0,
  y: 0,
  width: 100,
  height: 150,
  density: 0,
  burst,
  shakes,
});

describe("createDustBursts", () => {
  it("sheds nothing for the shakes before it first sees an emitter", () => {
    const bursts = createDustBursts();
    expect(bursts.take([emitter(2)], 64, true)).toHaveLength(0);
    expect(bursts.take([emitter(2)], 64, true)).toHaveLength(0);
  });

  it("sheds a burst sized by the edge for each shake, over as many frames as it needs", () => {
    const bursts = createDustBursts();
    bursts.take([emitter(0)], 64, true);
    const shed = [1, 1, 2, 2].map((shakes) =>
      bursts.take([emitter(shakes)], 30, true),
    );
    expect(shed.map((spawns) => spawns.length)).toEqual([30, 20, 30, 20]);
    expect(shed.flat().every((spawn) => spawn === 3 + DUST_BURST_SPAWN)).toBe(
      true,
    );
  });

  it("drops a burst under reduced motion", () => {
    const bursts = createDustBursts();
    bursts.take([emitter(0)], 64, true);
    expect(bursts.take([emitter(1)], 64, false)).toHaveLength(0);
    expect(bursts.take([emitter(1)], 64, true)).toHaveLength(0);
  });
});
