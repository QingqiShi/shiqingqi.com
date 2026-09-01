import { describe, expect, it } from "vitest";
import { EMOTIONS } from "../../state/creature-def-schema";
import { getEmotionMotion } from "./get-emotion-motion";
import { getReducedMotionEmotion } from "./get-reduced-motion-emotion";

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
