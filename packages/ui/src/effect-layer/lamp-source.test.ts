import { describe, expect, it } from "vitest";
import { lampSource, parseTranslateX } from "./lamp-source.ts";

describe("parseTranslateX", () => {
  it("reads the translation of a 2D matrix", () => {
    expect(parseTranslateX("matrix(1, 0, 0, 1, 18.5, 0)")).toBe(18.5);
  });

  it("reads the translation of a 3D matrix", () => {
    expect(
      parseTranslateX(
        "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 24, 0, 0, 1)",
      ),
    ).toBe(24);
  });

  it("is 0 for none or anything it cannot read", () => {
    expect(parseTranslateX("none")).toBe(0);
    expect(parseTranslateX("")).toBe(0);
    expect(parseTranslateX("matrix(1, 0, 0, 1)")).toBe(0);
  });
});

describe("lampSource", () => {
  it("puts the light at the centre of the thumb, moved along the track", () => {
    const box = { x: 100, y: 50, width: 80, height: 40 };
    expect(lampSource(box, 2, 36, 0)).toEqual({ x: 120, y: 70, radius: 18 });
    expect(lampSource(box, 2, 36, 40)).toEqual({ x: 160, y: 70, radius: 18 });
  });

  it("keeps a radius for a thumb with no width", () => {
    const box = { x: 0, y: 0, width: 80, height: 40 };
    expect(lampSource(box, 2, 0, 0).radius).toBe(0.5);
  });
});
