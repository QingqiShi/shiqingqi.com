import { gray } from "@tuja/ui/palette/gray";

/**
 * The contrast figures the Accessibility page prints, derived from the palette.
 * `text-role-contrast.test.ts` guards the tone names against `tokens.stylex.ts`.
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

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A tone step on the generated gray ramp, e.g. `"_20"`. */
export type GrayTone = keyof typeof gray;

/**
 * Per theme, each text tone paired with the lowest-contrast background it is used
 * on. Named rather than dereferenced so the drift test can name the tone it wants.
 */
export const TEXT_ROLE_TONES = [
  {
    token: "color.textMain",
    role: "textMain",
    tone: "default",
    light: { text: "_13", background: "_97" },
    dark: { text: "_92", background: "_7" },
  },
  {
    token: "color.textMuted",
    role: "textMuted",
    tone: "muted",
    light: { text: "_30", background: "_97" },
    dark: { text: "_80", background: "_7" },
  },
  {
    token: "color.textSubtle",
    role: "textSubtle",
    tone: "subtle",
    light: { text: "_40", background: "_97" },
    dark: { text: "_60", background: "_7" },
  },
] as const satisfies readonly {
  token: string;
  role: string;
  tone: "default" | "muted" | "subtle";
  light: { text: GrayTone; background: GrayTone };
  dark: { text: GrayTone; background: GrayTone };
}[];

/** The background role each theme's quoted pairing measures against. */
export const BINDING_BACKGROUND = {
  light: "bgCanvas",
  dark: "bgSurfaceRaised",
} as const;

/** WCAG AA floors: normal-size body text, and large text or UI components. */
export const BODY_TEXT_FLOOR = 4.5;
export const LARGE_TEXT_FLOOR = 3;

export interface TextRoleContrast {
  token: string;
  /** The matching `Text` `tone`, so the specimen uses the component's own colour. */
  tone: "default" | "muted" | "subtle";
  lightRatio: number;
  darkRatio: number;
  /** Formatted for display, e.g. `"12.13:1"`. */
  light: string;
  dark: string;
}

function format(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

export const TEXT_ROLE_CONTRAST: readonly TextRoleContrast[] =
  TEXT_ROLE_TONES.map((role) => {
    const lightRatio = contrastRatio(
      gray[role.light.text],
      gray[role.light.background],
    );
    const darkRatio = contrastRatio(
      gray[role.dark.text],
      gray[role.dark.background],
    );
    return {
      token: role.token,
      tone: role.tone,
      lightRatio,
      darkRatio,
      light: format(lightRatio),
      dark: format(darkRatio),
    };
  });
