import type { RgbChannels } from "./contrast-ratio.ts";
import { hexChannels } from "./hex-channels.ts";

// The constants of APCA-W3 0.0.98G-4g.
const BLACK_THRESHOLD = 0.022;
const BLACK_CLAMP = 1.414;
const SCALE = 1.14;
const OFFSET = 0.027;
const LOW_CLIP = 0.1;
const DELTA_Y_MIN = 0.0005;

function screenLuminance(colour: string | RgbChannels) {
  const [r, g, b] = typeof colour === "string" ? hexChannels(colour) : colour;
  const y =
    0.2126729 * (r / 255) ** 2.4 +
    0.7151522 * (g / 255) ** 2.4 +
    0.072175 * (b / 255) ** 2.4;
  return y < BLACK_THRESHOLD ? y + (BLACK_THRESHOLD - y) ** BLACK_CLAMP : y;
}

/**
 * The APCA lightness contrast (Lc) of opaque text on an opaque background,
 * from about -108 to 106. It is positive for dark text on a light background
 * and negative for light text on a dark one, so compare its absolute value
 * with a floor such as Lc 60. A string must be `#RRGGBB`.
 *
 * @internal
 * @see https://github.com/Myndex/apca-w3
 */
export function apcaContrast(
  text: string | RgbChannels,
  background: string | RgbChannels,
): number {
  const yText = screenLuminance(text);
  const yBackground = screenLuminance(background);
  if (Math.abs(yBackground - yText) < DELTA_Y_MIN) return 0;
  if (yBackground > yText) {
    const sapc = (yBackground ** 0.56 - yText ** 0.57) * SCALE;
    return sapc < LOW_CLIP ? 0 : (sapc - OFFSET) * 100;
  }
  const sapc = (yBackground ** 0.65 - yText ** 0.62) * SCALE;
  return sapc > -LOW_CLIP ? 0 : (sapc + OFFSET) * 100;
}
