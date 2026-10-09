import { describe, expect, it } from "vitest";
import {
  distanceToBox,
  lampOccluders,
  MAX_OCCLUDERS,
} from "./lamp-occluders.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type { EffectElementRecord } from "./types.ts";

function record(
  id: number,
  overrides: Partial<EffectElementRecord> = {},
): EffectElementRecord {
  return {
    id,
    element: document.createElement("div"),
    roles: 0,
    settings: {},
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    fixed: false,
    radii: [8, 8, 8, 8],
    cornerExponent: 2,
    fill: [0, 0, 0, 1],
    scope: PAGE_SCOPE,
    holds: null,
    scopeIndex: PAGE_SCOPE,
    ...overrides,
  };
}

const range = (firstElement: number, elementCount: number) => ({
  firstElement,
  elementCount,
});

describe("distanceToBox", () => {
  const box = {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    radii: [10, 10, 10, 10] as const,
  };

  it("is the gap to the nearest edge outside", () => {
    expect(distanceToBox(box, 150, 20)).toBe(50);
    expect(distanceToBox(box, 50, -30)).toBe(30);
  });

  it("follows the rounded corner", () => {
    const straight = distanceToBox(box, 110, 20);
    // 20px out from the arc's centre at (90, 30), along the diagonal.
    const diagonal = distanceToBox(
      box,
      90 + 20 * Math.SQRT1_2,
      30 + 20 * Math.SQRT1_2,
    );
    expect(straight).toBe(10);
    expect(diagonal).toBeCloseTo(10, 9);
  });

  it("is below zero inside and zero on the edge", () => {
    expect(distanceToBox(box, 50, 20)).toBe(-20);
    expect(distanceToBox(box, 100, 20)).toBe(0);
  });
});

describe("lampOccluders", () => {
  const light = { x: 50, y: 20 };

  it("picks the elements within reach, nearest first, and not the lamp", () => {
    const records = [
      record(0),
      record(1, { x: 300, y: 0 }),
      record(2, { x: 120, y: 0 }),
      record(3, { x: 1000, y: 0 }),
    ];
    expect(lampOccluders(records, range(0, 4), 0, light, 400)).toEqual([2, 1]);
  });

  it("leaves out an element the light is inside", () => {
    const records = [
      record(0, { x: -200, y: -200, width: 600, height: 600 }),
      record(1),
      record(2, { x: 120, y: 0 }),
    ];
    expect(lampOccluders(records, range(0, 3), 1, light, 400)).toEqual([2]);
  });

  it("keeps to its peers and to the most the shader holds", () => {
    const records = Array.from({ length: 12 }, (_, index) =>
      record(index, { x: 120 + index * 10, y: index * 50 }),
    );
    const picked = lampOccluders(records, range(1, 11), 0, light, 4000);
    expect(picked).toHaveLength(MAX_OCCLUDERS);
    expect(picked[0]).toBe(1);
    expect(picked).not.toContain(0);
    expect(lampOccluders(records, range(0, 1), 0, light, 4000)).toEqual([]);
  });
});
