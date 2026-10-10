import { describe, expect, it } from "vitest";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidBeads,
  packLiquidInstances,
  packLiquidParticles,
  type LiquidInstance,
} from "./liquid-wgsl.ts";

const INSTANCE: LiquidInstance = {
  elementIndex: 3,
  firstParticle: 150,
  particleCount: 150,
  firstBead: 2,
  beadCount: 1,
  radius: 22,
  calm: 0.5,
  originX: 122,
  originY: 224,
  restX: 48,
  centreX: 47,
  centreY: 0.5,
  thumb: [1, 1, 1],
  set: 0.7,
  plain: 0.25,
  frost: { core: 0.8, edge: 0.6 },
  off: [0.5, 0.5, 0.5],
  on: [0.4, 0.2, 0.8],
  rise: 0.25,
  riseGoal: 1,
  cover: true,
  glow: { color: [0.6, 0.4, 0.9], strength: 0.75 },
  backdrop: [1, 1, 1],
};

describe("packLiquidInstances", () => {
  it("packs each instance in struct order", () => {
    const buffer = new ArrayBuffer(LIQUID_INSTANCE_BYTES * 2);
    packLiquidInstances([INSTANCE, { ...INSTANCE, cover: false }], buffer);
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect([...words.slice(0, 6)]).toEqual([3, 150, 150, 2, 1, 1]);
    expect([floats[6], floats[7]]).toEqual([22, 0.5]);
    expect([...floats.slice(8, 10)]).toEqual([122, 224]);
    expect([...floats.slice(12, 16)]).toEqual([1, 1, 1, expect.closeTo(0.7)]);
    expect([...floats.slice(16, 20)]).toEqual([0.5, 0.5, 0.5, 0.25]);
    expect([...floats.slice(20, 24)]).toEqual([
      expect.closeTo(0.4),
      expect.closeTo(0.2),
      expect.closeTo(0.8),
      1,
    ]);
    expect([...floats.slice(28, 31)]).toEqual([48, 47, 0.5]);
    expect([...floats.slice(32, 36)]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(0.4),
      expect.closeTo(0.9),
      0.75,
    ]);
    expect([...floats.slice(36, 39)]).toEqual([
      expect.closeTo(0.8),
      expect.closeTo(0.6),
      0.25,
    ]);

    const second = LIQUID_INSTANCE_BYTES / 4;
    expect(words[second + 5]).toBe(0);
  });
});

describe("packLiquidParticles and packLiquidBeads", () => {
  it("pack positions as vec2f and beads as a centre and a radius", () => {
    const particles = new ArrayBuffer(16);
    packLiquidParticles(
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      particles,
    );
    expect([...new Float32Array(particles)]).toEqual([1, 2, 3, 4]);
    const beads = new ArrayBuffer(16);
    packLiquidBeads([{ x: 5, y: 6, radius: 2 }], beads);
    expect([...new Float32Array(beads)]).toEqual([5, 6, 2, 0]);
  });
});

describe("LIQUID_WGSL", () => {
  it("declares the liquid, its particles and its beads in group 2", () => {
    expect(LIQUID_WGSL).toContain("@group(2) @binding(0)");
    expect(LIQUID_WGSL).toContain("@group(2) @binding(1)");
    expect(LIQUID_WGSL).toContain("@group(2) @binding(2)");
    expect(LIQUID_WGSL).toContain("fn liquidVertex");
    expect(LIQUID_WGSL).toContain("fn liquidFragment");
  });
});
