/**
 * Source of truth for the system palette.
 *
 * Each hue is defined by an Apple HIG-inspired sRGB color, expanded into a
 * Material 3 HCT tonal palette (CAM16 hue/chroma + CIE L* tones). A per-hue
 * Catmull-Rom spline tweaks tones to compensate for the Helmholtz-Kohlrausch
 * effect — yellows/greens read dim at high tones, indigo reads bright at low
 * tones, etc. Curve anchors are L* offsets at tone {0, 25, 50, 75, 100}.
 *
 * Gray is a near-zero-chroma warm neutral whose source is tuned so its high
 * tones reproduce the tuned warm-cream background ramp (e.g. tone 92 ≈
 * #edece8). It is the source of every neutral token — backgrounds, text,
 * borders, dividers — so the whole neutral family shares one slight warmth.
 *
 * To regenerate the per-hue palette files and palette-table.ts:
 *   pnpm codegen:palette
 */

export interface SystemHueDefinition {
  name: string;
  source: string;
  curve: readonly number[];
}

export const SYSTEM_HUES: readonly SystemHueDefinition[] = [
  { name: "Red", source: "#FF3B30", curve: [0, 0, 5, 5, 0] },
  { name: "Orange", source: "#FF9500", curve: [0, 0, 12, 13, 0] },
  { name: "Yellow", source: "#FFCC00", curve: [0, 2, 13, 18, 1] },
  { name: "Green", source: "#34C759", curve: [0, 0, 13, 18, 2] },
  { name: "Mint", source: "#00C7BE", curve: [0, 0, 8, 10, 0] },
  { name: "Teal", source: "#30B0C7", curve: [0, 0, 5, 3, 0] },
  { name: "Cyan", source: "#32ADE6", curve: [0, 0, 2, 2, 0] },
  { name: "Blue", source: "#007AFF", curve: [0, -2, 3, 0, 0] },
  { name: "Indigo", source: "#5856D6", curve: [0, -7, 4, 0, 0] },
  { name: "Purple", source: "#AF52DE", curve: [0, -3, 3, 0, 0] },
  { name: "Pink", source: "#FF2D55", curve: [0, 14, 5, 2, 0] },
  { name: "Brown", source: "#A2845E", curve: [0, 11, 7, 8, 3] },
  // Gray source picked so HCT tones land on the tuned warm-cream background
  // ramp (tone 90 ≈ #e6e5e1, tone 92 ≈ #edece8, tone 100 = #ffffff). Chroma is
  // ~2.4 — barely perceptible warmth, vanishes at extreme lightness. This
  // replaces Apple HIG's cool `#8E8E93` because the design system uses a single
  // warm-neutral family across surfaces, text, and borders.
  { name: "Gray", source: "#777774", curve: [0, 0, 0, 0, 0] },
];
