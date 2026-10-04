import { describe, expect, it } from "vitest";
import type { RippleInstance, RippleRing } from "./create-ripples.ts";
import { packRippleInstances, RIPPLE_INSTANCE_BYTES } from "./ripple-wgsl.ts";
import type { EffectElementRecord } from "./types.ts";

function record(fill: EffectElementRecord["fill"]): EffectElementRecord {
  return {
    id: 1,
    element: document.createElement("div"),
    roles: 1,
    settings: {},
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    fixed: false,
    radii: [12, 12, 12, 12],
    cornerExponent: 4,
    fill,
    scope: 0,
    holds: null,
    scopeIndex: 0,
  };
}

function instance(overrides: Partial<RippleInstance>): RippleInstance {
  return { elementIndex: 0, rings: [], neighbours: [], ...overrides };
}

const ring = (front: number, wake: number): RippleRing => ({
  front,
  amount: 0.5,
  aimX: 0.25,
  aimY: -0.5,
  wake,
});

describe("packRippleInstances", () => {
  it("packs each instance as one RippleInstance struct, in order", () => {
    const buffer = new ArrayBuffer(2 * RIPPLE_INSTANCE_BYTES);
    new Uint32Array(buffer).fill(7);
    packRippleInstances(
      [
        instance({ elementIndex: 1, rings: [ring(4, 0.5), ring(30, 0.25)] }),
        instance({ neighbours: [0, 1, 4, 5, 6] }),
      ],
      {
        elements: [record([1, 1, 1, 0.25]), record([0.5, 0.25, 0.75, 1])],
        scopes: [
          {
            id: 0,
            container: -1,
            backdrop: [1, 1, 1, 1],
            dark: false,
            scroll: { firstElement: 0, elementCount: 2 },
            fixed: { firstElement: 2, elementCount: 0 },
          },
        ],
      },
      buffer,
    );
    const floats = new Float32Array(buffer);
    const words = new Uint32Array(buffer);
    const second = RIPPLE_INSTANCE_BYTES / 4;

    expect([...words.slice(0, 3)]).toEqual([1, 2, 0]);
    // The quad reaches the furthest crest.
    expect([...floats.slice(3, 5)]).toEqual([30, Math.fround(0.55)]);
    expect([...floats.slice(8, 12)]).toEqual([0.5, 0.25, 0.75, 0]);
    expect([...floats.slice(12, 16)]).toEqual([0.5, 0.25, 0, 0]);
    expect([...floats.slice(24, 32)]).toEqual([
      4, 0.5, 0.25, -0.5, 30, 0.5, 0.25, -0.5,
    ]);
    expect([...words.slice(32, 40)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);

    expect([...words.slice(second, second + 3)]).toEqual([0, 0, 5]);
    expect(floats[second + 3]).toBe(0);
    // A quarter-opaque fill covers the page half as much at the most.
    expect(floats[second + 4]).toBeCloseTo(0.275);
    expect([...words.slice(second + 16, second + 24)]).toEqual([
      0, 1, 4, 5, 6, 0, 0, 0,
    ]);
  });
});
