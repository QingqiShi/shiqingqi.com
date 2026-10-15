import { describe, expect, it } from "vitest";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidInstances,
  type LiquidInstance,
} from "./liquid-wgsl.ts";

const INSTANCE: LiquidInstance = {
  elementIndex: 3,
  radius: 22,
  originX: 122,
  originY: 224,
  thumb: [1, 1, 1],
  lightBody: true,
  off: [0.5, 0.5, 0.5],
  on: [0.4, 0.2, 0.8],
  ring: { off: [0.6, 0.6, 0.6, 1], on: [0.4, 0.2, 0.8, 1], width: 1 },
  rise: 0.25,
  riseGoal: 1,
  cover: true,
  seeThrough: false,
  backdrop: [1, 1, 1],
  body: 0.75,
  pill: [48, 4, 1.25, 0.75],
  leaving: [10, 4, 0.5],
  light: [0.6, -0.8],
  accent: [0.4, 0.2, 0.8],
  edge: [0.08, 0.06, 0.06, 0],
  edgeLit: 0.5,
  grid: [8192, 40, 10, 1],
  holeFill: [0.4, 1],
  motion: [12, 0.12, 3, 0.5],
};

describe("packLiquidInstances", () => {
  it("packs each instance in struct order", () => {
    const buffer = new ArrayBuffer(LIQUID_INSTANCE_BYTES * 2);
    packLiquidInstances(
      [INSTANCE, { ...INSTANCE, cover: false, lightBody: false }],
      buffer,
    );
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect([...words.slice(0, 2)]).toEqual([3, 5]);
    expect([...floats.slice(2, 8)]).toEqual([
      22,
      expect.closeTo(0.4),
      122,
      224,
      0.75,
      0.5,
    ]);
    expect([...floats.slice(8, 12)]).toEqual([1, 1, 1, 1]);
    expect([...floats.slice(12, 16)]).toEqual([0.5, 0.5, 0.5, 0.25]);
    expect([...floats.slice(16, 20)]).toEqual([
      expect.closeTo(0.4),
      expect.closeTo(0.2),
      expect.closeTo(0.8),
      1,
    ]);
    expect([...floats.slice(24, 28)]).toEqual([0, 0, 1, 1]);
    expect([...floats.slice(28, 32)]).toEqual([48, 4, 1.25, 0.75]);
    expect([...floats.slice(32, 36)]).toEqual([10, 4, 0.5, 0]);
    expect([...floats.slice(36, 40)]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(-0.8),
      0,
      0,
    ]);
    expect([...floats.slice(48, 52)]).toEqual([8192, 40, 10, 1]);
    expect([...floats.slice(52, 56)]).toEqual([
      12,
      expect.closeTo(0.12),
      3,
      0.5,
    ]);
    expect([...floats.slice(56, 64)]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(0.6),
      expect.closeTo(0.6),
      1,
      expect.closeTo(0.4),
      expect.closeTo(0.2),
      expect.closeTo(0.8),
      1,
    ]);

    const second = LIQUID_INSTANCE_BYTES / 4;
    expect(words[second + 1]).toBe(0);
  });

  it("packs an indicator's corners and marks that the track shows through it", () => {
    const buffer = new ArrayBuffer(LIQUID_INSTANCE_BYTES);
    packLiquidInstances(
      [
        {
          ...INSTANCE,
          cover: false,
          lightBody: false,
          seeThrough: true,
          corner: { radius: 12, exponent: 4 },
        },
      ],
      buffer,
    );
    expect(new Uint32Array(buffer)[1]).toBe(2);
    expect([...new Float32Array(buffer).slice(24, 26)]).toEqual([12, 4]);
  });
});

describe("LIQUID_WGSL", () => {
  it("declares the instances and the pixels in group 2", () => {
    expect(LIQUID_WGSL).toContain(
      "@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>",
    );
    expect(LIQUID_WGSL).toContain(
      "@group(2) @binding(1) var<storage, read> pixels: array<Pixel>",
    );
    expect(LIQUID_WGSL).toContain("fn liquidVertex");
    expect(LIQUID_WGSL).toContain("fn liquidFragment");
  });
});
