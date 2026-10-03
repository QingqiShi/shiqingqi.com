import { describe, expect, it } from "vitest";
import { beamMeetsRect, distanceToEdge, type Beam } from "./beam-meets-rect.ts";

describe("beamMeetsRect", () => {
  const beam: Beam = {
    x: 0,
    y: 0,
    angle: 0,
    start: 20,
    reach: 1000,
    color: [1, 1, 1],
  };
  const ahead = { x: 500, y: -50, width: 100, height: 100 };

  it("meets a rectangle the beam crosses", () => {
    expect(beamMeetsRect(beam, ahead, 0)).toBe(true);
  });

  it("misses a rectangle behind the beam or past its reach", () => {
    expect(beamMeetsRect(beam, { ...ahead, x: -700 }, 0)).toBe(false);
    expect(beamMeetsRect(beam, { ...ahead, x: 1500 }, 0)).toBe(false);
  });

  it("meets a rectangle beside the beam only when the lenses bend it there", () => {
    const beside = { ...ahead, y: 200 };
    expect(beamMeetsRect(beam, beside, 0)).toBe(false);
    expect(beamMeetsRect(beam, beside, 200)).toBe(true);
  });

  it("meets a rectangle the beam crosses at an angle", () => {
    const down = { ...beam, angle: Math.PI / 4 };
    expect(
      beamMeetsRect(down, { x: 400, y: 400, width: 50, height: 50 }, 0),
    ).toBe(true);
    expect(
      beamMeetsRect(down, { x: 400, y: 0, width: 50, height: 50 }, 0),
    ).toBe(false);
  });
});

describe("distanceToEdge", () => {
  it("reaches the side the direction points at", () => {
    expect(distanceToEdge(120, 60, 0)).toBeCloseTo(120, 9);
    expect(distanceToEdge(120, 60, Math.PI / 2)).toBeCloseTo(60, 9);
    expect(distanceToEdge(50, 50, Math.PI / 4)).toBeCloseTo(50 * Math.SQRT2, 9);
  });
});
