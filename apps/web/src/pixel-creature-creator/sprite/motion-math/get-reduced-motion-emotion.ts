import type { Emotion } from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { getEmotionMotion } from "./get-emotion-motion";
import type { EmotionMotion } from "./types";

/**
 * Reduced-motion: collapse every emotion to the gentle idle bob. Same
 * signature as `getEmotionMotion` so the consumer can swap based on the
 * `prefers-reduced-motion` media query.
 */
export function getReducedMotionEmotion(
  _emotion: Emotion,
  t: number,
): EmotionMotion {
  return getEmotionMotion("idle", t);
}
