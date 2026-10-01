import { gray } from "@tuja/ui/palette/gray.stylex";
import { contrastRatio } from "@tuja/ui/utils/contrast-ratio";

/**
 * The contrast figures the Accessibility page prints, derived from the palette.
 * The tone names mirror `tokens.stylex.ts` by hand.
 */

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
