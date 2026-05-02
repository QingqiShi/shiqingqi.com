import type { Emotion } from "../state/creature-schema";

/**
 * Pure motion math for the pixel sprite.
 *
 * Numbers are produced in *art-pixels* (the 42×42 species sprite grid).
 * The render boundary is responsible for rounding to whole art-pixels and
 * then scaling up to CSS pixels — that ordering keeps integer-pixel art
 * aligned no matter what `scale` factor the consumer picks.
 */

export const SPRITE_ART_PX = 42;

export interface Vec2 {
  dx: number;
  dy: number;
}

export interface EmotionMotion {
  body: Vec2;
}

const TAU = Math.PI * 2;

function bob(t: number, amplitude: number, period: number): number {
  // Negative so positive amplitude reads as "lift up" visually.
  return -amplitude * Math.sin((TAU * t) / period);
}

function joyBob(t: number, amplitude: number, period: number): number {
  // Quick rise, slow fall: square the |sin| then sign by phase.
  const phase = (t % period) / period;
  const wave = Math.sin(TAU * phase);
  // Bias toward the up-half of the cycle to feel bouncier.
  return -amplitude * (wave > 0 ? Math.pow(wave, 0.6) : -Math.pow(-wave, 1.4));
}

/**
 * Per-emotion motion in art-pixels (unsnapped). Caller snaps via
 * `snapToArtPixel` before scaling to CSS pixels.
 *
 * Species sprites have eyes baked in, so the "eye" / "overlay" vectors
 * from the v:1 multi-layer pipeline are gone — emotion expression rides
 * entirely on the single-layer body motion. Curiosity/grumpy add a small
 * lateral wobble to give the static art a hint of personality.
 */
export function getEmotionMotion(emotion: Emotion, t: number): EmotionMotion {
  switch (emotion) {
    case "idle": {
      return { body: { dx: 0, dy: bob(t, 0.6, 2.0) } };
    }
    case "joy": {
      return { body: { dx: 0, dy: joyBob(t, 1.2, 0.6) } };
    }
    case "sad": {
      // Sustained droop (dy > 0 = down) with a slow wobble.
      const wobble = bob(t, 0.2, 1.5);
      return { body: { dx: 0, dy: 0.6 + wobble } };
    }
    case "excited": {
      return { body: { dx: 0, dy: bob(t, 1.6, 0.35) } };
    }
    case "sleepy": {
      return { body: { dx: 0, dy: bob(t, 0.4, 3.0) } };
    }
    case "grumpy": {
      const dy = bob(t, 0.6, 2.0);
      const dx = 0.4 * Math.sin((TAU * t) / 1.0);
      return { body: { dx, dy } };
    }
    case "curious": {
      // Slow side-tilt + gentle bob, suggesting a head cock.
      const dy = bob(t, 0.5, 2.0);
      const dx = 0.3 * Math.sin((TAU * t) / 2.0);
      return { body: { dx, dy } };
    }
  }
}

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

// `Math.round(0.5) === 1` in V8 (half-up); `Math.round(0.49) === 0`. We
// intentionally rely on this — half-up is the natural choice for visual
// motion.
export function snapToArtPixel(value: number): number {
  return Math.round(value);
}

/** Convert art-pixel units to CSS pixels at the given scale. */
export function artPxToCssPx(artPx: number, scale: number): number {
  return artPx * scale;
}
