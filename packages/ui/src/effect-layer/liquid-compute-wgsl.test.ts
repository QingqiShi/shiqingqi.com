import { describe, expect, it } from "vitest";
import {
  LIQUID_COMPUTE_WGSL,
  LIQUID_STEP_BYTES,
  LIQUID_WORKGROUP_SIZE,
  packLiquidSteps,
  type LiquidStep,
} from "./liquid-compute-wgsl.ts";
import {
  LIQUID_PHYSICS,
  MAX_PARTICLE_COUNT,
  MAX_SUBSTEPS,
} from "./step-liquid.ts";

const STEP: LiquidStep = {
  slot: 3,
  count: 150,
  target: 2.2,
  span: 0.5,
  aim: -1,
  scale: 1.25,
  from: 0,
  to: 2.7,
  step: 0.025,
};

describe("packLiquidSteps", () => {
  it("packs each step in struct order", () => {
    const buffer = new ArrayBuffer(LIQUID_STEP_BYTES * 2);
    new Uint32Array(buffer).fill(0xffffffff);
    packLiquidSteps([STEP, { ...STEP, slot: 1, count: 225 }], buffer);
    const floats = new Float32Array(buffer);
    const words = new Uint32Array(buffer);
    expect([...floats.slice(0, 4)]).toEqual([
      expect.closeTo(2.2),
      0.5,
      -1,
      1.25,
    ]);
    expect([...floats.slice(4, 8)]).toEqual([
      0,
      expect.closeTo(2.7),
      expect.closeTo(0.025),
      0,
    ]);
    expect([...words.slice(8, 12)]).toEqual([150, 3, 0, 0]);
    const second = LIQUID_STEP_BYTES / 4;
    expect([...words.slice(second + 8, second + 10)]).toEqual([225, 1]);
  });
});

describe("LIQUID_COMPUTE_WGSL", () => {
  it("gives every particle of the largest body an invocation of its own", () => {
    expect(LIQUID_WORKGROUP_SIZE).toBeGreaterThanOrEqual(MAX_PARTICLE_COUNT);
    expect(LIQUID_COMPUTE_WGSL).toContain(
      `@compute @workgroup_size(${String(LIQUID_WORKGROUP_SIZE)})`,
    );
    expect(LIQUID_COMPUTE_WGSL).toContain("fn simulate(");
  });

  it("bakes in the physics of the CPU reference, as float constants", () => {
    for (const [name, value] of Object.entries(LIQUID_PHYSICS)) {
      const match = new RegExp(`const ${name} = ([-0-9.e+]+);`).exec(
        LIQUID_COMPUTE_WGSL,
      );
      expect(match, name).not.toBeNull();
      expect(match?.[1]).toMatch(/[.e]/);
      expect(Number(match?.[1])).toBe(value);
    }
    expect(LIQUID_COMPUTE_WGSL).toContain(
      `const MAX_SUBSTEPS = ${String(MAX_SUBSTEPS)}u;`,
    );
  });

  it("gives tanh only an argument that relaxed math keeps finite", () => {
    // WebKit compiles Metal with relaxed math, where a tanh that goes
    // through exp overflows to NaN on a wide track. A NaN particle never
    // settles, so the indicator would be gone for good.
    expect(LIQUID_COMPUTE_WGSL.match(/tanh\(/g)).toHaveLength(1);
    expect(LIQUID_COMPUTE_WGSL).toContain(
      "tanh(clamp(away / TILT_REACH, -LEAN_LIMIT, LEAN_LIMIT))",
    );
    expect(LIQUID_PHYSICS.LEAN_LIMIT).toBeLessThanOrEqual(44);
    expect(Math.tanh(LIQUID_PHYSICS.LEAN_LIMIT)).toBe(1);
  });

  it("binds the steps and the slots in group 0", () => {
    expect(LIQUID_COMPUTE_WGSL).toContain(
      "@group(0) @binding(0) var<storage, read> steps: array<LiquidStep>",
    );
    expect(LIQUID_COMPUTE_WGSL).toContain(
      "@group(0) @binding(1) var<storage, read_write> slots: array<LiquidSlot>",
    );
  });
});
