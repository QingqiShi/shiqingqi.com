/**
 * Source of truth for the system palette.
 *
 * Each hue is defined by an Apple HIG-inspired sRGB color, expanded into a
 * Material 3 HCT tonal palette (CAM16 hue/chroma + CIE L* tones). The tone at
 * each step is not taken as-is: the generator solves it so the hue's Hellwig
 * 2022 lightness (CAM16 with the Helmholtz-Kohlrausch term) equals gray's at
 * that step, so every hue reads as equally bright at the same tone. The one
 * ramp curve below reshapes the gray ramp that every hue is matched to. Its
 * anchors are L* offsets at tone {0, 25, 50, 75, 100}.
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
}

export const RAMP_CURVE: readonly number[] = [0, 10, 20, 10, 0];

export const SYSTEM_HUES: readonly SystemHueDefinition[] = [
  { name: "Red", source: "#FF3B30" },
  { name: "Orange", source: "#FF9500" },
  { name: "Yellow", source: "#FFCC00" },
  { name: "Green", source: "#34C759" },
  { name: "Mint", source: "#00C7BE" },
  { name: "Teal", source: "#30B0C7" },
  { name: "Cyan", source: "#32ADE6" },
  { name: "Blue", source: "#007AFF" },
  { name: "Indigo", source: "#5856D6" },
  { name: "Purple", source: "#AF52DE" },
  { name: "Pink", source: "#FF2D55" },
  { name: "Brown", source: "#A2845E" },
  // Gray source picked so HCT tones land on the tuned warm-cream background
  // ramp (tone 90 ≈ #e6e5e1, tone 92 ≈ #edece8, tone 100 = #ffffff). Chroma is
  // ~2.4 — barely perceptible warmth, vanishes at extreme lightness. This
  // replaces Apple HIG's cool `#8E8E93` because the design system uses a single
  // warm-neutral family across surfaces, text, and borders.
  { name: "Gray", source: "#777774" },
];
