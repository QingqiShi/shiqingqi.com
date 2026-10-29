export const SERIES_TONES = [
  "series1",
  "series2",
  "series3",
  "series4",
  "series5",
  "series6",
  "series7",
  "series8",
] as const;

/** A categorical colour slot, the grey of "Other", or the accent for a lone series. */
export type SeriesTone = (typeof SERIES_TONES)[number] | "other" | "accent";

/**
 * The colour slot of the entity at `index` in a fixed order, such as a
 * Category's rank over all time. Past the last slot it is "Other": slots are
 * never reused, so two series never share a colour.
 */
export function seriesToneAt(index: number): SeriesTone {
  return index >= 0 && index < SERIES_TONES.length
    ? SERIES_TONES[index]
    : "other";
}
