import { describe, expect, it } from "vitest";
import {
  LIQUID_SHARED_WGSL,
  LIQUID_SLOT_BYTES,
  packLiquidSlot,
  readLiquidSlot,
} from "./liquid-shared-wgsl.ts";
import { MAX_PARTICLE_COUNT, restingLiquid } from "./step-liquid.ts";

describe("packLiquidSlot and readLiquidSlot", () => {
  it("put a body's particles and walls into a slot and read them back", () => {
    const body = restingLiquid(2, { span: 0.5, from: 1, to: 4 });
    const floats = new Float32Array((LIQUID_SLOT_BYTES / 4) * 2);
    floats.fill(7);
    const offset = LIQUID_SLOT_BYTES / 4;
    packLiquidSlot(body, floats, offset);
    expect([...floats.slice(0, offset)].every((value) => value === 7)).toBe(
      true,
    );
    expect([...floats.slice(offset, offset + 4)]).toEqual([1, 4, 0, 0]);
    expect([...floats.slice(offset + 4, offset + 8)]).toEqual([
      body.x[0],
      body.y[0],
      0,
      0,
    ]);
    const read = readLiquidSlot(floats, offset, body.x.length);
    expect(read).toEqual({
      x: body.x,
      y: body.y,
      vx: body.vx,
      vy: body.vy,
      from: 1,
      to: 4,
    });
  });

  it("leaves the slot's unused particles at zero", () => {
    const body = restingLiquid(0);
    const floats = new Float32Array(LIQUID_SLOT_BYTES / 4).fill(1);
    packLiquidSlot(body, floats);
    const unused = floats.slice(4 + body.x.length * 4);
    expect(unused).toHaveLength((MAX_PARTICLE_COUNT - body.x.length) * 4);
    expect([...unused].every((value) => value === 0)).toBe(true);
  });
});

describe("LIQUID_SHARED_WGSL", () => {
  it("declares a slot as large as the slot bytes", () => {
    expect(LIQUID_SHARED_WGSL).toContain(
      `const LIQUID_MAX_PARTICLES = ${String(MAX_PARTICLE_COUNT)}u;`,
    );
    expect(LIQUID_SHARED_WGSL).toContain(
      "particles: array<vec4f, LIQUID_MAX_PARTICLES>",
    );
    expect(LIQUID_SLOT_BYTES).toBe(16 + MAX_PARTICLE_COUNT * 16);
  });
});
