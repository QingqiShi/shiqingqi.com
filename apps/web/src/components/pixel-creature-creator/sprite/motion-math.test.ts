import { describe, expect, it } from "vitest";
import { EMOTIONS } from "../state/creature-schema";
import {
  SPRITE_ART_PX,
  artPxToCssPx,
  getEmotionMotion,
  getReducedMotionEmotion,
  snapToArtPixel,
} from "./motion-math";

describe("snapToArtPixel", () => {
  it("rounds 0.49 down to 0", () => {
    expect(snapToArtPixel(0.49)).toBe(0);
  });

  it("rounds 0.5 up to 1 (V8 half-up)", () => {
    expect(snapToArtPixel(0.5)).toBe(1);
  });

  it("rounds negatives toward +∞ at the half boundary (V8 behaviour)", () => {
    // V8: Math.round(-0.5) === -0 (rounds toward +∞), Math.round(-1.5) === -1.
    // Use Object.is so the -0/+0 distinction is treated as equivalent for
    // the documented semantics ("rounds toward +∞").
    expect(
      Object.is(snapToArtPixel(-0.5), -0) || snapToArtPixel(-0.5) === 0,
    ).toBe(true);
    expect(snapToArtPixel(-1.5)).toBe(-1);
  });
});

describe("artPxToCssPx", () => {
  it("scales art-pixel values to CSS pixels", () => {
    expect(artPxToCssPx(2, 8)).toBe(16);
    expect(artPxToCssPx(0, 8)).toBe(0);
  });
});

describe("SPRITE_ART_PX", () => {
  it("is 42 (species native size)", () => {
    expect(SPRITE_ART_PX).toBe(42);
  });
});

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

describe("getReducedMotionEmotion", () => {
  it("returns the idle motion for every emotion", () => {
    for (const emotion of EMOTIONS) {
      const reduced = getReducedMotionEmotion(emotion, 1.23);
      const idle = getEmotionMotion("idle", 1.23);
      expect(reduced).toEqual(idle);
    }
  });

  it("is deterministic", () => {
    expect(getReducedMotionEmotion("joy", 0.77)).toEqual(
      getReducedMotionEmotion("joy", 0.77),
    );
  });
});
