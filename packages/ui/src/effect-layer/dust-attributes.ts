/**
 * The attributes that `Dust` and `ExtractorFan` put on a box-less ancestor
 * of the element they register, read by the dust effect each frame, and the
 * value it takes when one is missing.
 *
 * @internal
 */
export const DUST_ATTRIBUTES = {
  density: { name: "data-dust-density", fallback: 3 },
  reach: { name: "data-extractor-fan-reach", fallback: 400 },
} as const;
