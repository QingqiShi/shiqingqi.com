import { describe, expect, it } from "vitest";
import {
  LIQUID_INSTANCE_BYTES,
  LIQUID_WGSL,
  packLiquidBeads,
  packLiquidInstances,
  type LiquidInstance,
} from "./liquid-wgsl.ts";

const INSTANCE: LiquidInstance = {
  elementIndex: 3,
  slot: 5,
  particleCount: 150,
  firstBead: 2,
  beadCount: 1,
  radius: 22,
  restRadius: 22,
  restSpan: 0,
  calm: 0.5,
  originX: 122,
  originY: 224,
  restX: 48,
  span: 0,
  scale: 1.25,
  spread: 2,
  centreX: 47,
  centreY: 0.5,
  thumb: [1, 1, 1],
  set: 0.75,
  lightBody: true,
  off: [0.5, 0.5, 0.5],
  on: [0.4, 0.2, 0.8],
  ring: { off: [0.6, 0.6, 0.6, 1], on: [0.4, 0.2, 0.8, 1], width: 1 },
  rise: 0.25,
  riseGoal: 1,
  cover: true,
  seeThrough: false,
  room: false,
  backdrop: [1, 1, 1],
  body: 0.25,
  light: [0.6, -0.8],
  edge: [0.08, 0.06, 0.06, 0],
  edgeLit: 0.5,
  leaving: [96, 4, 0.25],
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
    expect([...words.slice(0, 6)]).toEqual([3, 5, 150, 2, 1, 5]);
    expect([...floats.slice(6, 12)]).toEqual([22, 0.5, 122, 224, 0.25, 0.5]);
    expect([...floats.slice(12, 16)]).toEqual([1, 1, 1, 0.75]);
    expect([...floats.slice(16, 20)]).toEqual([0.5, 0.5, 0.5, 0.25]);
    expect([...floats.slice(20, 24)]).toEqual([
      expect.closeTo(0.4),
      expect.closeTo(0.2),
      expect.closeTo(0.8),
      1,
    ]);
    expect([...floats.slice(24, 28)]).toEqual([1, 1, 1, 2]);
    expect([...floats.slice(28, 32)]).toEqual([48, 47, 0.5, 0]);
    expect([...floats.slice(32, 36)]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(-0.8),
      1.25,
      1,
    ]);
    expect([...floats.slice(36, 40)]).toEqual([
      expect.closeTo(0.08),
      expect.closeTo(0.06),
      expect.closeTo(0.06),
      0,
    ]);
    expect([...floats.slice(40, 48)]).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(0.6),
      expect.closeTo(0.6),
      1,
      expect.closeTo(0.4),
      expect.closeTo(0.2),
      expect.closeTo(0.8),
      1,
    ]);
    expect([...floats.slice(48, 52)]).toEqual([0, 0, 22, 0]);
    expect([...floats.slice(52, 56)]).toEqual([96, 4, 0.25, 0]);

    const second = LIQUID_INSTANCE_BYTES / 4;
    expect(words[second + 5]).toBe(0);
  });

  it("packs a grabber's room, the bar it sets into, and the edge of its card", () => {
    const buffer = new ArrayBuffer(LIQUID_INSTANCE_BYTES);
    packLiquidInstances(
      [
        {
          ...INSTANCE,
          cover: false,
          lightBody: false,
          room: true,
          restRadius: 2,
          restSpan: 14,
          surface: { edge: 300, above: [0.5, 0.5, 0.5] },
        },
      ],
      buffer,
    );
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect(words[5]).toBe(8);
    expect([...floats.slice(50, 52)]).toEqual([2, 14]);
    expect([...floats.slice(56, 60)]).toEqual([300, 0.5, 0.5, 0.5]);
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
    expect(new Uint32Array(buffer)[5]).toBe(2);
    expect([...new Float32Array(buffer).slice(48, 50)]).toEqual([12, 4]);
  });

  it("keeps each instance a whole number of 16-byte rows, as WGSL lays the struct out", () => {
    expect(LIQUID_INSTANCE_BYTES % 16).toBe(0);
  });
});

describe("packLiquidBeads", () => {
  it("packs each bead as its centre and its radius", () => {
    const buffer = new ArrayBuffer(32);
    packLiquidBeads(
      [
        { x: 1, y: 2, radius: 3 },
        { x: 4, y: 5, radius: 6 },
      ],
      buffer,
    );
    expect([...new Float32Array(buffer)]).toEqual([1, 2, 3, 0, 4, 5, 6, 0]);
  });
});

describe("LIQUID_WGSL", () => {
  it("declares the instances, the particles' slots and the beads in group 2", () => {
    expect(LIQUID_WGSL).toContain(
      "@group(2) @binding(0) var<storage, read> liquids: array<LiquidInstance>",
    );
    expect(LIQUID_WGSL).toContain(
      "@group(2) @binding(1) var<storage, read> slots: array<LiquidSlot>",
    );
    expect(LIQUID_WGSL).toContain(
      "@group(2) @binding(2) var<storage, read> beads: array<Bead>",
    );
    expect(LIQUID_WGSL).toContain("fn liquidVertex");
    expect(LIQUID_WGSL).toContain("fn liquidFragment");
  });
});
