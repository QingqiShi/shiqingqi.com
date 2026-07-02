// Maps an arbitrary color (hex or rgb/rgba string) to the nearest swatch in the
// system palette. Author mode uses this so a hand-picked color can be written
// back to `tokens.stylex.ts` as a palette reference (`gray._20`) rather than a
// raw literal, keeping the palette philosophy intact. Palette swatches are plain
// hex consts, so the match is fully deterministic and runs in the browser.

import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "../_generated/palette/palette-table.ts";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface RgbaColor extends Rgb {
  a: number;
}

export interface PaletteMatch {
  /** Lowercase hue id matching the palette token namespace, e.g. "gray". */
  hue: string;
  /** Tonal step, e.g. 20 → token member `_20`. */
  tone: number;
  /** The palette swatch hex, e.g. "#30312E". */
  hex: string;
  /** Weighted RGB distance from the requested color (0 = exact match). */
  distance: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,8})$/i;
const RGB_PATTERN = /^rgba?\(([^)]+)\)$/i;

function parseHex(body: string): RgbaColor | null {
  const hex =
    body.length === 3 || body.length === 4
      ? Array.from(body, (char) => char + char).join("")
      : body;
  if (hex.length !== 6 && hex.length !== 8) return null;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b, a };
}

function parseRgb(body: string): RgbaColor | null {
  const parts = (
    body.includes(",") ? body.split(",") : body.replace("/", " ").split(/\s+/)
  )
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length < 3) return null;
  const r = Number.parseFloat(parts[0]);
  const g = Number.parseFloat(parts[1]);
  const b = Number.parseFloat(parts[2]);
  const a = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;
  if ([r, g, b, a].some((value) => Number.isNaN(value))) return null;
  return { r, g, b, a };
}

/**
 * Parse a CSS color string into RGBA channels. Handles `#rgb`, `#rgba`,
 * `#rrggbb`, `#rrggbbaa`, `rgb(...)`, and `rgba(...)` (comma- or
 * space-separated). Returns `null` for anything it can't read.
 */
export function parseColor(input: string): RgbaColor | null {
  const value = input.trim();
  const hexMatch = HEX_PATTERN.exec(value);
  if (hexMatch?.[1] !== undefined) return parseHex(hexMatch[1]);
  const rgbMatch = RGB_PATTERN.exec(value);
  if (rgbMatch?.[1] !== undefined) return parseRgb(rgbMatch[1]);
  return null;
}

// Redmean: a cheap perceptual-ish RGB distance, better than plain Euclidean for
// picking the visually closest tone. Alpha is ignored — matching is on hue.
function colorDistance(a: Rgb, b: Rgb): number {
  const rmean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db,
  );
}

// Palette hexes are constants, so parse every swatch once at module load. Each
// nearestPaletteTone() call then parses only its input and walks this flat list.
interface ParsedSwatch {
  hue: string;
  tone: number;
  hex: string;
  rgb: Rgb;
}

const PARSED_SWATCHES: readonly ParsedSwatch[] = systemPalette.flatMap(
  (palette) => {
    const hue = palette.name.toLowerCase();
    return SYSTEM_PALETTE_TONES.flatMap((tone) => {
      const hex = palette.tones[tone].bg;
      const parsed = parseColor(hex);
      return parsed
        ? [{ hue, tone, hex, rgb: { r: parsed.r, g: parsed.g, b: parsed.b } }]
        : [];
    });
  },
);

/**
 * Find the palette swatch closest to `input`. Returns `null` if the color can't
 * be parsed.
 */
export function nearestPaletteTone(input: string): PaletteMatch | null {
  const target = parseColor(input);
  if (!target) return null;

  let best: PaletteMatch | null = null;
  for (const swatch of PARSED_SWATCHES) {
    const distance = colorDistance(target, swatch.rgb);
    // On an exact tie prefer the neutral `gray` hue: pure black/white are shared
    // by every hue's _0/_100, so without this a neutral binds to whichever hue
    // iterates first (red) and a neutral token would reference the red ramp.
    const better =
      !best ||
      distance < best.distance ||
      (distance === best.distance &&
        swatch.hue === "gray" &&
        best.hue !== "gray");
    if (better) {
      best = { hue: swatch.hue, tone: swatch.tone, hex: swatch.hex, distance };
    }
  }
  return best;
}

export interface PaletteSwatch {
  /** Tonal step, e.g. 92 → token member `_92`. */
  tone: number;
  /** Swatch background hex, e.g. "#E9E8E4". */
  hex: string;
  /** A readable on-swatch color for the selected ring, from the table. */
  fg: string;
}

export interface PaletteHue {
  /** Lowercase hue id, matching the token namespace, e.g. "gray". */
  hue: string;
  /** Display label, e.g. "Gray". */
  label: string;
  /** The hue's source seed swatch, e.g. "#777774". */
  source: string;
  /** The full tonal ramp, dark → light, as defined by the palette table. */
  tones: PaletteSwatch[];
}

/**
 * The system palette reshaped for the author-mode picker: every hue with its
 * full tonal ramp as plain hex swatches. Derived from the generated table, so it
 * can never drift from the source palette. This is what makes a palette-only
 * picker possible — the user chooses a hue + tone here rather than any color.
 */
export const paletteHues: readonly PaletteHue[] = systemPalette.map(
  (palette) => ({
    hue: palette.name.toLowerCase(),
    label: palette.name,
    source: palette.source,
    tones: SYSTEM_PALETTE_TONES.map((tone) => ({
      tone,
      hex: palette.tones[tone].bg,
      fg: palette.tones[tone].fg,
    })),
  }),
);

/**
 * Compose the color string to commit when a palette swatch is picked, carrying
 * over the alpha of the value being replaced. Opaque picks commit the swatch hex
 * unchanged; translucent tokens (overlay scrims, tint surfaces, translucent
 * borders) keep their existing alpha so both the live preview and the eventual
 * `rgba(${hue_rgb._tone}, alpha)` recipe stay faithful to the source. A null or
 * fully-opaque alpha returns the hex as-is.
 */
export function withAlpha(hex: string, alpha: number | null): string {
  if (alpha === null || alpha >= 1) return hex;
  const rgb = parseColor(hex);
  if (!rgb) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 1000) / 1000;
  return `rgba(${String(rgb.r)}, ${String(rgb.g)}, ${String(rgb.b)}, ${String(a)})`;
}
