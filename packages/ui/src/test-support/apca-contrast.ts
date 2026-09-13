import { hexChannels } from "./hex-channels.ts";

// APCA 0.1.9 (the WCAG 3 draft method). Unlike the WCAG 2 ratio it is
// polarity-aware, so light text on a mid-tone fill and dark text on the same
// fill get different scores, matching what the eye sees.
const BLACK_THRESHOLD = 0.022;
const BLACK_CLAMP = 1.414;
const LOW_CLIP = 0.1;
const OFFSET = 0.027;
const SCALE = 1.14;

function apcaY(hex: string) {
  const [r, g, b] = hexChannels(hex).map((channel) =>
    Math.pow(channel / 255, 2.4),
  );
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}

function softClamp(y: number) {
  return y > BLACK_THRESHOLD
    ? y
    : y + Math.pow(BLACK_THRESHOLD - y, BLACK_CLAMP);
}

/**
 * Absolute APCA lightness contrast (Lc) of `text` on `background`. Guide
 * floors: 90 for 14px body, 75 for 16px body, 60 for 16px semibold or 24px,
 * 45 for large headlines and non-text, 30 for anything that must be read.
 *
 * @internal
 */
export function apcaContrast(text: string, background: string) {
  const yText = softClamp(apcaY(text));
  const yBackground = softClamp(apcaY(background));
  if (Math.abs(yBackground - yText) < 0.0005) return 0;
  const sapc =
    yBackground > yText
      ? (Math.pow(yBackground, 0.56) - Math.pow(yText, 0.57)) * SCALE
      : (Math.pow(yBackground, 0.65) - Math.pow(yText, 0.62)) * SCALE;
  if (Math.abs(sapc) < LOW_CLIP) return 0;
  return (Math.abs(sapc) - OFFSET) * 100;
}
