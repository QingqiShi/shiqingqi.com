import { describe, expect, it } from "vitest";
import { leanLight, type LightContext } from "./lean-light.ts";
import type { EffectPointer } from "./types.ts";

const VIEWPORT = { x: 0, y: 1000, width: 400, height: 800 };
const NO_LEAN = { lean: 0, toPointer: [0, 0] as const };
const FULL_LEAN = { lean: 1, toPointer: [0, 0] as const };
const RADIUS = 14;

function mouseAt(x: number, y: number): EffectPointer {
  return {
    x,
    y,
    velocityX: 0,
    velocityY: 0,
    pressed: false,
    present: true,
    pointerType: "mouse",
  };
}

const NO_POINTER: EffectPointer = { ...mouseAt(0, 0), present: false };

function lightAt(
  centre: { x: number; y: number },
  pointer: EffectPointer = NO_POINTER,
  previous = NO_LEAN,
) {
  const context: LightContext = { pointer, viewport: VIEWPORT };
  return leanLight(context, previous, centre, RADIUS, 1, false);
}

describe("leanLight", () => {
  it("comes from the viewport's top-left corner with no pointer", () => {
    const { light, resting } = lightAt({ x: 200, y: 1200 });
    expect(light[0]).toBeCloseTo(-Math.SQRT1_2);
    expect(light[1]).toBeCloseTo(-Math.SQRT1_2);
    expect(resting).toBe(true);
  });

  it("turns from the side to the top as a scroll takes the control down", () => {
    const high = lightAt({ x: 200, y: 1050 }).light;
    const low = lightAt({ x: 200, y: 1750 }).light;
    expect(Math.abs(high[0])).toBeGreaterThan(Math.abs(high[1]));
    expect(Math.abs(low[1])).toBeGreaterThan(Math.abs(low[0]));
  });

  it("comes from a pointer far from the control", () => {
    const { light } = lightAt(
      { x: 200, y: 1200 },
      mouseAt(200, 1700),
      FULL_LEAN,
    );
    expect(light[0]).toBeLessThan(0);
    expect(light[1]).toBeGreaterThan(0.99);
  });

  it("keeps the corner's light for a pointer over the centre", () => {
    const left = lightAt({ x: 200, y: 1200 }, mouseAt(197, 1200), FULL_LEAN);
    const right = lightAt({ x: 200, y: 1200 }, mouseAt(203, 1200), FULL_LEAN);
    expect(left.light[1]).toBeLessThan(-0.5);
    expect(right.light[1]).toBeLessThan(-0.5);
    expect(right.light[0] - left.light[0]).toBeLessThan(0.5);
  });

  it("does not take a finger as the light", () => {
    const finger = {
      ...mouseAt(200, 1700),
      pressed: true,
      pointerType: "touch",
    };
    const { light, lean } = lightAt({ x: 200, y: 1200 }, finger);
    expect(lean).toBe(0);
    expect(light[1]).toBeLessThan(0);
  });

  it("eases towards a pointer that comes, and back once it leaves", () => {
    const centre = { x: 200, y: 1200 };
    const pointer = mouseAt(200, 1700);
    const context: LightContext = { pointer, viewport: VIEWPORT };
    const coming = leanLight(context, NO_LEAN, centre, RADIUS, 0.016, false);
    expect(coming.lean).toBeGreaterThan(0);
    expect(coming.lean).toBeLessThan(1);
    expect(coming.resting).toBe(false);

    const leaving = leanLight(
      { pointer: NO_POINTER, viewport: VIEWPORT },
      { lean: 1, toPointer: coming.toPointer },
      centre,
      RADIUS,
      0.016,
      false,
    );
    expect(leaving.lean).toBeLessThan(1);
    expect(leaving.light[1]).toBeGreaterThan(0);
  });

  it("holds still under reduced motion", () => {
    const context: LightContext = {
      pointer: mouseAt(200, 1700),
      viewport: VIEWPORT,
    };
    const { light } = leanLight(
      context,
      NO_LEAN,
      { x: 0, y: 0 },
      RADIUS,
      1,
      true,
    );
    expect(light).toEqual([-0.537, -0.844]);
  });
});
