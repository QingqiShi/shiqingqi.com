import { describe, expect, it } from "vitest";
import {
  packPixelDraws,
  packPixelSteps,
  PIXEL_BYTES,
  PIXEL_COMPUTE_WGSL,
  PIXEL_DRAW_BYTES,
  PIXEL_SHARED_WGSL,
  PIXEL_STEP_BYTES,
  PIXEL_WGSL,
  type PixelStep,
} from "./pixel-wgsl.ts";
import {
  LIFETIME_VARY,
  PIXEL_FLOATS,
  PIXEL_MAX_SUBSTEPS,
  PIXEL_PHYSICS,
  SHED_LIFETIME,
} from "./step-pixels.ts";

const STEP: PixelStep = {
  offset: 8192,
  grid: { cols: 60, rows: 20 },
  pill: { x: 130, span: 18, radius: 16 },
  speed: -240,
  push: -24_000,
  stretch: [1.25, 0.75],
  time: 0.05,
  delta: 1 / 60,
  tick: 3,
  seed: 4_000_000_000,
  corner: 12,
};

describe("packPixelSteps", () => {
  it("packs each step in struct order", () => {
    const buffer = new ArrayBuffer(PIXEL_STEP_BYTES * 2);
    packPixelSteps([STEP, { ...STEP, offset: 0 }], buffer);
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect([...words.slice(0, 4)]).toEqual([8192, 1200, 60, 20]);
    expect([...floats.slice(4, 8)]).toEqual([130, 18, 16, -240]);
    expect([...floats.slice(8, 11)]).toEqual([
      expect.closeTo(0.05),
      expect.closeTo(1 / 60),
      3,
    ]);
    expect(words[11]).toBe(4_000_000_000);
    expect([...floats.slice(12, 16)]).toEqual([-24_000, 1.25, 0.75, 12]);
    expect(words[PIXEL_STEP_BYTES / 4]).toBe(0);
  });
});

describe("packPixelDraws", () => {
  it("packs each draw in struct order", () => {
    const buffer = new ArrayBuffer(PIXEL_DRAW_BYTES);
    packPixelDraws(
      [
        {
          elementIndex: 4,
          offset: 16384,
          count: 400,
          cell: 3,
          originX: 10,
          originY: 20,
          time: 0.5,
          color: [0.5, 0.5, 0.5, 1],
          shadow: [0, 0, 0, 0.25],
          light: [0.25, 0.25, 0.25],
          tint: [0.75, 0.5, 1, 1],
        },
      ],
      buffer,
    );
    const words = new Uint32Array(buffer);
    const floats = new Float32Array(buffer);
    expect(words[0]).toBe(4);
    expect([...floats.slice(1, 8)]).toEqual([3, 10, 20, 0.5, 0, 0, 0]);
    expect([...floats.slice(8, 24)]).toEqual([
      0.5, 0.5, 0.5, 1, 0, 0, 0, 0.25, 0.25, 0.25, 0.25, 0, 0.75, 0.5, 1, 1,
    ]);
  });
});

describe("PIXEL_SHARED_WGSL", () => {
  it("bakes in the lifetime of a shed pixel from the CPU reference, for the simulation and the draw", () => {
    for (const [name, value] of [
      ["SHED_LIFETIME", SHED_LIFETIME],
      ["LIFETIME_VARY", LIFETIME_VARY],
    ] as const) {
      const match = new RegExp(`const ${name} = ([-0-9.e+]+);`).exec(
        PIXEL_SHARED_WGSL,
      );
      expect(Number(match?.[1]), name).toBe(value);
    }
    expect(PIXEL_COMPUTE_WGSL).toContain(PIXEL_SHARED_WGSL);
    expect(PIXEL_WGSL).toContain(PIXEL_SHARED_WGSL);
  });
});

describe("PIXEL_COMPUTE_WGSL", () => {
  it("bakes in the physics of the CPU reference, as float constants", () => {
    for (const [name, value] of Object.entries(PIXEL_PHYSICS)) {
      const match = new RegExp(`const ${name} = ([-0-9.e+]+);`).exec(
        PIXEL_SHARED_WGSL,
      );
      expect(match, name).not.toBeNull();
      expect(match?.[1]).toMatch(/[.e]/);
      expect(Number(match?.[1])).toBe(value);
    }
    expect(PIXEL_COMPUTE_WGSL).toContain(
      `const PIXEL_MAX_SUBSTEPS = ${String(PIXEL_MAX_SUBSTEPS)}u;`,
    );
  });

  it("binds the steps, the pixels and the counts of pixels away in group 0", () => {
    expect(PIXEL_COMPUTE_WGSL).toContain(
      "@group(0) @binding(0) var<storage, read> steps: array<PixelStep>",
    );
    expect(PIXEL_COMPUTE_WGSL).toContain(
      "@group(0) @binding(1) var<storage, read_write> pixels: array<Pixel>",
    );
    expect(PIXEL_COMPUTE_WGSL).toContain(
      "@group(0) @binding(2) var<storage, read_write> moving: array<atomic<u32>>",
    );
  });

  it("gives a pixel the size the CPU packs", () => {
    expect(PIXEL_BYTES).toBe(PIXEL_FLOATS * 4);
  });
});
