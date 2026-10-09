import type { EffectSettings } from "./types.ts";

/**
 * The value of each setting when a hook does not get one. An effect also
 * uses it when a registered element has the role but not the setting, or
 * when the setting is not a finite number.
 *
 * @internal
 */
export const EFFECT_SETTING_DEFAULTS = {
  dust: { density: 3 },
  extractorFan: { reach: 400 },
  blackHole: { mass: 1 },
  lightBeam: { angle: undefined, followsPointer: true },
  liquidThumb: { position: 0, drag: null },
} as const satisfies Required<EffectSettings>;

/**
 * A setting that is a finite number, or else the fallback.
 *
 * @internal
 */
export function finiteOr<T>(value: number | undefined, fallback: T) {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

/**
 * A registration with no settings.
 *
 * @internal
 */
export const NO_SETTINGS: EffectSettings = {};
