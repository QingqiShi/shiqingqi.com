import { describe, expect, it } from "vitest";
import {
  packSweepInstances,
  SWEEP_INSTANCE_BYTES,
  SWEEP_WGSL,
} from "./sweep-wgsl.ts";

describe("packSweepInstances", () => {
  it("packs each instance in struct order", () => {
    const buffer = new ArrayBuffer(SWEEP_INSTANCE_BYTES * 2);
    packSweepInstances(
      [
        {
          elementIndex: 3,
          state: {
            comets: [
              { head: 0.25, direction: 1, strength: 0.5, tail: 0.2 },
              { head: 0.75, direction: -1, strength: 0.5, tail: 0.2 },
            ],
            even: 0,
          },
          core: [1, 0.9, 0.8, 1],
          halo: [0.5, 0.4, 0.3, 1],
          alpha: 0.9,
        },
        {
          elementIndex: 5,
          state: { comets: [], even: 0.6 },
          core: [1, 1, 1, 1],
          halo: [0, 0, 0, 1],
          alpha: 1,
        },
      ],
      buffer,
    );
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect([words[0], words[1]]).toEqual([3, 2]);
    expect([floats[2], floats[3]]).toEqual([0, expect.closeTo(0.9)]);
    expect([...floats.slice(4, 8)]).toEqual([
      1,
      expect.closeTo(0.9),
      expect.closeTo(0.8),
      1,
    ]);
    expect([...floats.slice(12, 16)]).toEqual([
      0.25,
      1,
      0.5,
      expect.closeTo(0.2),
    ]);
    expect([...floats.slice(16, 20)]).toEqual([
      0.75,
      -1,
      0.5,
      expect.closeTo(0.2),
    ]);

    const second = SWEEP_INSTANCE_BYTES / 4;
    expect([words[second], words[second + 1]]).toEqual([5, 0]);
    expect(floats[second + 2]).toBeCloseTo(0.6);
    expect([...floats.slice(second + 12, second + 20)]).toEqual(
      Array(8).fill(0),
    );
  });
});

describe("SWEEP_WGSL", () => {
  it("declares the sweep instances in group 2", () => {
    expect(SWEEP_WGSL).toContain("@group(2) @binding(0)");
    expect(SWEEP_WGSL).toContain("fn sweepVertex");
    expect(SWEEP_WGSL).toContain("fn sweepFragment");
  });
});
