import { describe, expect, it } from "vitest";
import { trackMotion } from "./track-motion.ts";

describe("trackMotion", () => {
  it("knows no speed or direction from the first reading", () => {
    expect(trackMotion(null, 400, 1000)).toEqual({
      y: 400,
      at: 1000,
      speed: 0,
      dir: 0,
    });
  });

  it("takes the speed and direction of a scroll at once", () => {
    const start = trackMotion(null, 0, 1000);

    expect(trackMotion(start, 48, 1016)).toEqual({
      y: 48,
      at: 1016,
      speed: 3000,
      dir: 1,
    });
  });

  it("reads a scroll up as direction -1", () => {
    const start = trackMotion(null, 1000, 1000);

    expect(trackMotion(start, 952, 1016).dir).toBe(-1);
  });

  it("ignores readings too close in time to give a speed", () => {
    const start = trackMotion(null, 0, 1000);

    expect(trackMotion(start, 1, 1000.5)).toBe(start);
  });

  it("lets the speed fall away slowly when the scroll stops", () => {
    const moving = trackMotion(trackMotion(null, 0, 1000), 48, 1016);
    const still = trackMotion(moving, 48, 1032);

    expect(still.speed).toBeCloseTo(2550);
    expect(still.dir).toBe(1);
  });

  it("keeps the last direction through a slow drift", () => {
    const moving = trackMotion(trackMotion(null, 0, 1000), 48, 1016);

    expect(trackMotion(moving, 47.5, 1032).dir).toBe(1);
  });

  it("forgets speed and direction after a long gap", () => {
    const moving = trackMotion(trackMotion(null, 0, 1000), 48, 1016);

    expect(trackMotion(moving, 2000, 1300)).toEqual({
      y: 2000,
      at: 1300,
      speed: 0,
      dir: 0,
    });
  });
});
