import { gray } from "@tuja/ui/palette/gray.stylex";

/**
 * The contrast figures the Accessibility page prints, derived from the palette.
 * The tone names mirror `tokens.stylex.ts` by hand.
 */

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const [r = 0, g = 0, b = 0] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A tone step on the generated gray ramp, e.g. `"_20"`. */
type GrayTone = keyof typeof gray;

/**
 * Per theme, each text tone paired with the tone of the background it is
 * measured against (`bgCanvas` in light, `bgSurfaceRaised` in dark). Named as tone strings so
 * this file can look up the exact `gray` step for the ratio.
 */
const TEXT_ROLE_TONES = [
  {
    token: "color.fg",
    tone: "default",
    light: { text: "_13", background: "_97" },
    dark: { text: "_92", background: "_7" },
  },
  {
    token: "color.fgMuted",
    tone: "muted",
    light: { text: "_30", background: "_97" },
    dark: { text: "_80", background: "_7" },
  },
] as const satisfies readonly {
  token: string;
  tone: "default" | "muted";
  light: { text: GrayTone; background: GrayTone };
  dark: { text: GrayTone; background: GrayTone };
}[];

export interface TextRoleContrast {
  token: string;
  /** The matching `Text` `tone`, so the specimen uses the component's own colour. */
  tone: "default" | "muted";
  /** Formatted for display, e.g. `"12.13:1"`. */
  light: string;
  dark: string;
}

function format(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

export const TEXT_ROLE_CONTRAST: readonly TextRoleContrast[] =
  TEXT_ROLE_TONES.map((role) => {
    return {
      token: role.token,
      tone: role.tone,
      light: format(
        contrastRatio(gray[role.light.text], gray[role.light.background]),
      ),
      dark: format(
        contrastRatio(gray[role.dark.text], gray[role.dark.background]),
      ),
    };
  });
