import type { EffectColor } from "./parse-css-color.ts";
import type { RingLightState } from "./ring-lap-at.ts";
import type { RingLightInstance } from "./ring-light-layout.ts";
import type { EffectInput } from "./types.ts";

/**
 * How far the light goes to the bloom's colour where it is over the page.
 *
 * @internal
 */
export const PAGE_TINT = { light: 0.65, dark: 0.4 } as const;

/**
 * One element with a ring light this frame.
 *
 * @internal
 */
export interface RingLightInstanceRecord {
  /** Its index in `EffectFrame.elements` and in `effectElements`. */
  readonly elementIndex: number;
  readonly state: RingLightState;
  /** The glint, sRGB with its strength as alpha. */
  readonly core: EffectColor;
  /** The colour a comet's tail takes a hint of. */
  readonly tint: EffectColor;
  /** The colour of the bloom round the glint. */
  readonly bloom: EffectColor;
  /** The most the light covers the page. */
  readonly alpha: number;
  /** How far the light goes to the bloom's colour where it is over the page. */
  readonly pageTint: number;
}

const NO_COMET = [0, 0, 0, 0] as const;

/**
 * `ringLights[index]` for one record.
 *
 * @internal
 */
export function ringLightInstanceValue({
  elementIndex,
  state: { comet, even },
  core,
  tint,
  bloom,
  alpha,
  pageTint,
}: RingLightInstanceRecord): EffectInput<typeof RingLightInstance> {
  return {
    element: elementIndex,
    even,
    alpha,
    pageTint,
    core,
    tint,
    bloom,
    comet:
      comet === null
        ? NO_COMET
        : [comet.head, comet.direction, comet.strength, comet.tail],
  };
}
