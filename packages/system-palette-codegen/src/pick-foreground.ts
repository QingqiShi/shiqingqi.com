import { FOREGROUND_DARK, FOREGROUND_LIGHT } from "./constants.ts";
import { contrastRatio } from "./contrast-ratio.ts";

/** The foreground of a swatch: whichever of black or white contrasts more. */
export function pickForeground(backgroundHex: string): string {
  const black = contrastRatio(backgroundHex, FOREGROUND_DARK);
  const white = contrastRatio(backgroundHex, FOREGROUND_LIGHT);
  return black >= white ? FOREGROUND_DARK : FOREGROUND_LIGHT;
}
