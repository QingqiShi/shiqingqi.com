import { describe, expect, it } from "vitest";
import { roleConstantsWgsl } from "./effect-roles.ts";
import {
  ELEMENT_BYTES,
  packElements,
  packPageUniform,
  PAGE_UNIFORM_BYTES,
} from "./page-wgsl.ts";
import type { EffectElementRecord } from "./types.ts";

function record(
  overrides: Partial<EffectElementRecord> = {},
): EffectElementRecord {
  return {
    id: 7,
    element: document.createElement("div"),
    roles: 0b101,
    x: 10,
    y: 1200.5,
    width: 320,
    height: 180,
    fixed: false,
    radii: [16, 16, 8, 0],
    cornerExponent: 4,
    fill: [0.25, 0.5, 0.75, 1],
    ...overrides,
  };
}

describe("packElements", () => {
  it("packs each element as one EffectElement struct, in order", () => {
    const buffer = new ArrayBuffer(2 * ELEMENT_BYTES);
    packElements(
      [record(), record({ id: 8, fixed: true, roles: 0, x: -4 })],
      buffer,
    );
    const floats = new Float32Array(buffer);
    const words = new Uint32Array(buffer);

    expect([...floats.slice(0, 12)]).toEqual([
      10, 1200.5, 320, 180, 16, 16, 8, 0, 0.25, 0.5, 0.75, 1,
    ]);
    expect([words[12], words[13], floats[14], words[15]]).toEqual([
      0b101, 0, 4, 7,
    ]);

    const second = ELEMENT_BYTES / 4;
    expect(floats[second]).toBe(-4);
    expect([
      words[second + 12],
      words[second + 13],
      words[second + 15],
    ]).toEqual([0, 1, 8]);
  });

  it("leaves the rest of the buffer as it was", () => {
    const buffer = new ArrayBuffer(2 * ELEMENT_BYTES);
    new Uint32Array(buffer).fill(9);
    packElements([record()], buffer);
    const words = new Uint32Array(buffer, ELEMENT_BYTES);
    expect(words.every((word) => word === 9)).toBe(true);
  });
});

describe("packPageUniform", () => {
  it("packs the page in field order, with the pointer's flags as bits", () => {
    const uniform = packPageUniform({
      viewport: [0, 640, 1280, 800],
      pointer: {
        x: 100,
        y: 740,
        velocityX: -30,
        velocityY: 12,
        pressed: true,
        present: true,
      },
      documentSize: [1280, 5000],
      seconds: 2.5,
      delta: 0.016,
      elementCount: 3,
    });
    expect(uniform.byteLength).toBe(PAGE_UNIFORM_BYTES);
    const floats = new Float32Array(uniform);
    const words = new Uint32Array(uniform);
    expect([...floats.slice(0, 11)]).toEqual([
      0, 640, 1280, 800, 100, 740, -30, 12, 1280, 5000, 2.5,
    ]);
    expect(floats[11]).toBeCloseTo(0.016, 6);
    expect([words[12], words[13]]).toEqual([3, 0b11]);
  });

  it("clears the flags of a pointer that left", () => {
    const uniform = packPageUniform({
      viewport: [0, 0, 1, 1],
      pointer: {
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        pressed: false,
        present: false,
      },
      documentSize: [1, 1],
      seconds: 0,
      delta: 0,
      elementCount: 0,
    });
    expect(new Uint32Array(uniform)[13]).toBe(0);
  });
});

describe("roleConstantsWgsl", () => {
  it("gives each role the bit of its place in the list", () => {
    expect(roleConstantsWgsl(["ripple", "extractorFan", "blackHole"])).toBe(
      [
        "const EFFECT_ROLE_RIPPLE = 1u;",
        "const EFFECT_ROLE_EXTRACTOR_FAN = 2u;",
        "const EFFECT_ROLE_BLACK_HOLE = 4u;",
      ].join("\n"),
    );
  });
});
