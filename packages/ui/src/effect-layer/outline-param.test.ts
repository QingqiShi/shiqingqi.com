import { describe, expect, it } from "vitest";
import {
  farthestOutlineParam,
  floodReach,
  outlineDistance,
  outlineLength,
  outlineParam,
} from "./outline-param.ts";

/** A `md` Switch track below the `md` breakpoint: a stadium 2:1. */
const STADIUM = { width: 96, height: 48, radius: 24 };
const ROUNDED = { width: 100, height: 60, radius: 10 };

describe("outlineLength", () => {
  it("is two straight edges and a circle for a stadium", () => {
    expect(outlineLength(STADIUM)).toBeCloseTo(2 * 48 + 2 * Math.PI * 24);
  });

  it("caps the radius at half the shorter side", () => {
    expect(outlineLength({ width: 96, height: 48, radius: 40 })).toBeCloseTo(
      outlineLength(STADIUM),
    );
  });

  it("is the perimeter of a box with square corners", () => {
    expect(outlineLength({ width: 30, height: 20, radius: 0 })).toBe(100);
  });
});

describe("outlineParam", () => {
  const length = outlineLength(ROUNDED);
  const quarter = (Math.PI / 2) * ROUNDED.radius;

  it("starts at the middle of the top edge and runs clockwise", () => {
    expect(outlineParam(ROUNDED, 50, 0)).toBe(0);
    expect(outlineParam(ROUNDED, 70, 0)).toBe(20);
    expect(outlineParam(ROUNDED, 90, 0)).toBe(40);
  });

  it("runs the corner arcs by their angle", () => {
    // Half way around the top-right arc.
    const diagonal = 10 / Math.SQRT2;
    expect(outlineParam(ROUNDED, 90 + diagonal, 10 - diagonal)).toBeCloseTo(
      40 + quarter / 2,
    );
    expect(outlineParam(ROUNDED, 100, 10)).toBeCloseTo(40 + quarter);
  });

  it("runs down the right edge, back along the bottom and up the left", () => {
    expect(outlineParam(ROUNDED, 100, 30)).toBeCloseTo(40 + quarter + 20);
    expect(outlineParam(ROUNDED, 50, 60)).toBeCloseTo(40 + 2 * quarter + 80);
    expect(outlineParam(ROUNDED, 0, 30)).toBeCloseTo(
      40 + 3 * quarter + 120 + 20,
    );
  });

  it("ends where it started", () => {
    expect(outlineParam(ROUNDED, 30, 0)).toBeCloseTo(length - 20);
    expect(outlineParam(ROUNDED, 49.999, 0)).toBeCloseTo(length, 2);
  });

  it("takes a point level with the top-left arc's centre as the arc's start", () => {
    expect(outlineParam(ROUNDED, 0, 10)).toBeCloseTo(
      40 + 3 * quarter + 120 + 40,
    );
  });

  it("projects a point inside the box onto the nearest edge", () => {
    expect(outlineParam(ROUNDED, 60, 5)).toBe(10);
    expect(outlineParam(ROUNDED, 60, 55)).toBeCloseTo(40 + 2 * quarter + 70);
    expect(outlineParam(ROUNDED, 3, 30)).toBeCloseTo(
      40 + 3 * quarter + 120 + 20,
    );
  });

  it("projects a point outside the box onto the nearest edge", () => {
    expect(outlineParam(ROUNDED, 60, -8)).toBe(10);
    expect(outlineParam(ROUNDED, 110, 30)).toBeCloseTo(40 + quarter + 20);
  });

  it("maps the thumb of an off switch to the tip of the left cap", () => {
    expect(outlineParam(STADIUM, 24, 24)).toBeCloseTo(
      outlineLength(STADIUM) / 2 + 24 + Math.PI * 12,
    );
  });

  it("stays below the outline's length all around", () => {
    for (let angle = 0; angle < 2 * Math.PI; angle += 0.05) {
      const x = STADIUM.width / 2 + 60 * Math.cos(angle);
      const y = STADIUM.height / 2 + 60 * Math.sin(angle);
      const param = outlineParam(STADIUM, x, y);
      expect(param).toBeGreaterThanOrEqual(0);
      expect(param).toBeLessThanOrEqual(outlineLength(STADIUM));
    }
  });
});

describe("outlineDistance", () => {
  it("is below zero inside and zero on the edge", () => {
    expect(outlineDistance(STADIUM, 48, 24)).toBe(-24);
    expect(outlineDistance(STADIUM, 48, 0)).toBe(0);
    expect(outlineDistance(STADIUM, 0, 24)).toBeCloseTo(0);
    expect(outlineDistance(STADIUM, 24, 24)).toBe(-24);
  });

  it("is the distance to the cap from outside", () => {
    expect(outlineDistance(STADIUM, -10, 24)).toBeCloseTo(10);
    expect(outlineDistance(STADIUM, 48, 58)).toBe(10);
  });
});

describe("farthestOutlineParam", () => {
  it("is the tip of the far cap from the thumb of an off switch", () => {
    expect(farthestOutlineParam(STADIUM, 24, 24)).toBeCloseTo(
      24 + (Math.PI / 2) * 24,
    );
  });

  it("is on the far arc from a corner of a box with small corners", () => {
    const quarter = (Math.PI / 2) * ROUNDED.radius;
    const param = farthestOutlineParam(ROUNDED, 0, 0);
    expect(param).toBeGreaterThan(40 + quarter + 40);
    expect(param).toBeLessThan(40 + 2 * quarter + 40);
  });
});

describe("floodReach", () => {
  it("reaches the far cap from the thumb of an off switch", () => {
    expect(floodReach(STADIUM, 24, 24)).toBe(48 + 24);
  });

  it("reaches a cap from the middle", () => {
    expect(floodReach(STADIUM, 48, 24)).toBe(24 + 24);
  });

  it("reaches past every corner of a box with small corners", () => {
    expect(floodReach(ROUNDED, 0, 0)).toBeCloseTo(Math.hypot(90, 50) + 10);
  });
});
