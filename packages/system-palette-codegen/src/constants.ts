/**
 * The tone scale is denser at the extremes than the conventional Material 3
 * grid: extra stops at 2/5/7/9/11/13 (dark surfaces) and 92/95/97/98/99 (light
 * surfaces) let surface ramps live inside the palette rather than as a
 * separately-tuned token set. Mid-tones (20–80) stay on the familiar 10-point
 * grid for chromatic UI roles.
 */
export const SYSTEM_PALETTE_TONES = [
  0, 2, 5, 7, 9, 11, 13, 20, 30, 40, 50, 60, 70, 80, 90, 92, 95, 97, 98, 99,
  100,
] as const;

/** The tones a hue curve carries an L* offset for. */
export const ANCHOR_POSITIONS = [0, 25, 50, 75, 100] as const;

export const FOREGROUND_DARK = "#000000";
export const FOREGROUND_LIGHT = "#FFFFFF";
