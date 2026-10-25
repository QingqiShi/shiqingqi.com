import { describe, expect, it } from "vitest";
import { easing } from "../primitives/motion.stylex.ts";
import { cssEasing } from "./css-easing.ts";

describe("cssEasing", () => {
  it("keeps the ends", () => {
    for (const token of ["ease-out", easing.entrance, "linear"]) {
      const ease = cssEasing(token);
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }
  });

  it("follows a cubic Bézier", () => {
    expect(cssEasing("ease-out")(0.5)).toBeCloseTo(0.68464, 4);
    expect(cssEasing("ease")(0.5)).toBeCloseTo(0.8024, 4);
    expect(cssEasing(easing.entrance)(0.1)).toBeCloseTo(0.26982, 4);
  });

  it("rises all the way", () => {
    const entrance = cssEasing(easing.entrance);
    for (let share = 0.05; share < 1; share += 0.05) {
      expect(entrance(share)).toBeGreaterThan(entrance(share - 0.05));
    }
  });

  it("refuses an easing it cannot solve", () => {
    expect(() => cssEasing("steps(4)")).toThrow(RangeError);
  });
});
