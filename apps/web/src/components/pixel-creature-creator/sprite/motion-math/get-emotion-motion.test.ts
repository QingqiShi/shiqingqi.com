import { describe, expect, it } from "vitest";
import { EMOTIONS } from "../../state/creature-def-schema";
import { getEmotionMotion } from "./get-emotion-motion";

describe("getEmotionMotion", () => {
  it("at t=0 idle produces body dy near zero", () => {
    const motion = getEmotionMotion("idle", 0);
    expect(Math.abs(motion.body.dy)).toBeLessThan(1e-9);
    expect(motion.body.dx).toBe(0);
  });

  it("is deterministic for every emotion", () => {
    for (const emotion of EMOTIONS) {
      const a = getEmotionMotion(emotion, 0.42);
      const b = getEmotionMotion(emotion, 0.42);
      expect(a).toEqual(b);
    }
  });

  it("produces non-trivial motion at non-zero t", () => {
    const motion = getEmotionMotion("excited", 0.1);
    expect(motion.body.dy).not.toBe(0);
  });

  it("sad sustains a downward droop at t=0", () => {
    // Sad's dy starts at +0.6 (down) plus the wobble — verifies the
    // sustained droop is intrinsic, not phase-dependent.
    const motion = getEmotionMotion("sad", 0);
    expect(motion.body.dy).toBeGreaterThan(0);
  });

  it("grumpy and curious add lateral motion (non-zero dx for some t)", () => {
    // dx oscillates with sin; sample a point where sin is non-zero.
    expect(getEmotionMotion("grumpy", 0.25).body.dx).not.toBe(0);
    expect(getEmotionMotion("curious", 0.5).body.dx).not.toBe(0);
  });
});
