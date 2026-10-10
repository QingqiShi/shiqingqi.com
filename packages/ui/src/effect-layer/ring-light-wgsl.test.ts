import { describe, expect, it } from "vitest";
import {
  packRingLightInstances,
  RING_LIGHT_INSTANCE_BYTES,
  RING_LIGHT_WGSL,
} from "./ring-light-wgsl.ts";

describe("packRingLightInstances", () => {
  it("packs each instance in struct order", () => {
    const buffer = new ArrayBuffer(RING_LIGHT_INSTANCE_BYTES * 2);
    packRingLightInstances(
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
          tint: [0.5, 0.4, 0.3, 1],
          bloom: [0.7, 0.6, 0.5, 0.35],
          alpha: 0.9,
          inset: 0.8,
          pageTint: 1,
        },
        {
          elementIndex: 5,
          state: { comets: [], even: 0.6 },
          core: [1, 1, 1, 1],
          tint: [0, 0, 0, 1],
          bloom: [0, 0, 0, 0.5],
          alpha: 1,
          inset: 0.25,
          pageTint: 0,
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
    expect(floats[8]).toBe(0.5);
    expect(floats[15]).toBeCloseTo(0.35);
    expect([...floats.slice(16, 20)]).toEqual([
      0.25,
      1,
      0.5,
      expect.closeTo(0.2),
    ]);
    expect([...floats.slice(20, 24)]).toEqual([
      0.75,
      -1,
      0.5,
      expect.closeTo(0.2),
    ]);
    expect([floats[24], floats[25]]).toEqual([expect.closeTo(0.8), 1]);

    const second = RING_LIGHT_INSTANCE_BYTES / 4;
    expect(second * 4).toBe(112);
    expect([words[second], words[second + 1]]).toEqual([5, 0]);
    expect(floats[second + 2]).toBeCloseTo(0.6);
    expect([...floats.slice(second + 16, second + 24)]).toEqual(
      Array(8).fill(0),
    );
    expect(floats[second + 24]).toBe(0.25);
  });
});

describe("RING_LIGHT_WGSL", () => {
  it("declares the ring light instances in group 2", () => {
    expect(RING_LIGHT_WGSL).toContain("@group(2) @binding(0)");
    expect(RING_LIGHT_WGSL).toContain("fn ringLightVertex");
    expect(RING_LIGHT_WGSL).toContain("fn ringLightFragment");
  });
});
