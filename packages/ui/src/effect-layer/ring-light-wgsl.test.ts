import { describe, expect, it } from "vitest";
import {
  packRingLightInstances,
  RING_LIGHT_INSTANCE_BYTES,
  RING_LIGHT_WGSL,
} from "./ring-light-wgsl.ts";

describe("packRingLightInstances", () => {
  it("packs each instance in struct order", () => {
    const buffer = new ArrayBuffer(RING_LIGHT_INSTANCE_BYTES * 2);
    // Fill the buffer first, to show that an instance with no comet clears
    // the comet of an earlier frame.
    new Float32Array(buffer).fill(9);
    packRingLightInstances(
      [
        {
          elementIndex: 3,
          state: {
            comet: { head: 0.25, direction: -1, strength: 0.5, tail: 0.2 },
            even: 0,
          },
          core: [1, 0.9, 0.8, 1],
          tint: [0.5, 0.4, 0.3, 1],
          bloom: [0.7, 0.6, 0.5, 1],
          alpha: 0.9,
          pageTint: 0.65,
        },
        {
          elementIndex: 5,
          state: { comet: null, even: 0.6 },
          core: [1, 1, 1, 1],
          tint: [0, 0, 0, 1],
          bloom: [0, 0, 0, 1],
          alpha: 1,
          pageTint: 0.4,
        },
      ],
      buffer,
    );
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect(words[0]).toBe(3);
    expect([...floats.slice(1, 4)]).toEqual([
      0,
      expect.closeTo(0.9),
      expect.closeTo(0.65),
    ]);
    expect([...floats.slice(4, 8)]).toEqual([
      1,
      expect.closeTo(0.9),
      expect.closeTo(0.8),
      1,
    ]);
    expect(floats[8]).toBe(0.5);
    expect(floats[12]).toBeCloseTo(0.7);
    expect([...floats.slice(16, 20)]).toEqual([
      0.25,
      -1,
      0.5,
      expect.closeTo(0.2),
    ]);

    const second = RING_LIGHT_INSTANCE_BYTES / 4;
    expect(second * 4).toBe(80);
    expect(words[second]).toBe(5);
    expect(floats[second + 1]).toBeCloseTo(0.6);
    expect(floats[second + 3]).toBeCloseTo(0.4);
    expect([...floats.slice(second + 16, second + 20)]).toEqual([0, 0, 0, 0]);
  });
});

describe("RING_LIGHT_WGSL", () => {
  it("declares the ring light instances in group 2", () => {
    expect(RING_LIGHT_WGSL).toContain("@group(2) @binding(0)");
    expect(RING_LIGHT_WGSL).toContain("fn ringLightVertex");
    expect(RING_LIGHT_WGSL).toContain("fn ringLightFragment");
  });
});
