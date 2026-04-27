import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";

const light = {
  colorScheme: "light",

  textMain: "#292929",
  textMuted: "#505050",
  textSubtle: "#737373",
  textOnActive: "#ffffff",
  textOnControlThumb: "#292929",
  textAccent: "#6b0fa7",

  backgroundMain: "#ffffff",
  backgroundRaised: "#f5f5f5",
  backgroundElevated: "#fafafa",
  backgroundSunken: "#ebebeb",
  backgroundHover: "#f0f0f0",
  backgroundTranslucent: "rgba(0, 0, 0, 0.01)",
  backgroundInverse: "#161616",
  backgroundMainChannels: "255,255,255",
  backgroundRaisedChannels: "245,245,245",
  backgroundCalculatorButton: "#e0e0e0",
  backgroundCalculatorButtonHover: "#ffffff",

  surfaceAccentSubtle: "rgba(126, 16, 194, 0.08)",
  surfaceAccentMuted: "rgba(126, 16, 194, 0.16)",
  surfaceInfoSubtle: "rgba(2, 132, 199, 0.1)",
  surfaceSuccessSubtle: "rgba(22, 163, 74, 0.1)",
  surfaceWarningSubtle: "rgba(217, 119, 6, 0.12)",
  surfaceDangerSubtle: "rgba(220, 38, 38, 0.1)",

  controlTrack: "#e0e0e0",
  controlThumb: "#ffffff",
  controlActive: "#7e10c2",
  controlActiveHover: "#9e2de3",
  controlActiveSubtle: "rgba(126, 16, 194, 0.12)",

  border: "#e0e0e0",
  borderSubtle: "#ededed",
  borderStrong: "#cccccc",
  borderAccent: "rgba(126, 16, 194, 0.4)",

  opacityActive: "0.1",

  shadowColor: "220 3% 15%",
  shadowStrength: "1%",
  shadowAccent: "rgba(126, 16, 194, 0.25)",

  // Semantic colors — bold (foreground), subtle (background tint), text (on subtle), on (on bold)
  info: "#0284c7",
  infoText: "#075985",
  infoOn: "#ffffff",
  success: "#16a34a",
  successText: "#14532d",
  successOn: "#ffffff",
  warning: "#d97706",
  warningText: "#78350f",
  warningOn: "#ffffff",
  danger: "#dc2626",
  dangerText: "#7f1d1d",
  dangerOn: "#ffffff",

  brandTmdb: "#0ea5e9",
  brandCalculator: "#ff8000",
  brandCitadel: "rgb(26,54,104)",
  brandWtcPlus: "#e661b2",
  brandWtcLetter: "#0a47ed",
  brandBristol: "#bf2f38",
  brandNottingham: "#005480",
  brandSpotify: "#1ecc5a",
  brandStudentLoan: "#10b981",
};

const dark: { [key in keyof typeof light]: string } = {
  colorScheme: "dark",

  textMain: "#f3eded",
  textMuted: "#bbbbbb",
  textSubtle: "#8a8a8a",
  textOnActive: "#ffffff",
  textOnControlThumb: "#000000",
  textAccent: "#c794ec",

  backgroundMain: "#000000",
  backgroundRaised: "#1a1a1a",
  backgroundElevated: "#242424",
  backgroundSunken: "#0a0a0a",
  backgroundHover: "#2a2a2a",
  backgroundTranslucent: "rgba(255, 255, 255, 0.1)",
  backgroundInverse: "#f5f5f5",
  backgroundMainChannels: "0,0,0",
  backgroundRaisedChannels: "26,26,26",
  backgroundCalculatorButton: "#444850",
  backgroundCalculatorButtonHover: "#5e6065",

  surfaceAccentSubtle: "rgba(199, 148, 236, 0.12)",
  surfaceAccentMuted: "rgba(199, 148, 236, 0.2)",
  surfaceInfoSubtle: "rgba(56, 189, 248, 0.14)",
  surfaceSuccessSubtle: "rgba(74, 222, 128, 0.14)",
  surfaceWarningSubtle: "rgba(251, 191, 36, 0.16)",
  surfaceDangerSubtle: "rgba(248, 113, 113, 0.14)",

  controlTrack: "#1a1a1a",
  controlThumb: "#bbbbbb",
  controlActive: "#933bc9",
  controlActiveHover: "#a751db",
  controlActiveSubtle: "rgba(199, 148, 236, 0.18)",

  border: "#333333",
  borderSubtle: "#262626",
  borderStrong: "#4a4a4a",
  borderAccent: "rgba(199, 148, 236, 0.4)",

  opacityActive: "0.2",

  shadowColor: "220 40% 2%",
  shadowStrength: "25%",
  shadowAccent: "rgba(147, 59, 201, 0.45)",

  info: "#38bdf8",
  infoText: "#bae6fd",
  infoOn: "#082f49",
  success: "#4ade80",
  successText: "#bbf7d0",
  successOn: "#052e16",
  warning: "#fbbf24",
  warningText: "#fde68a",
  warningOn: "#451a03",
  danger: "#f87171",
  dangerText: "#fecaca",
  dangerOn: "#450a0a",

  brandTmdb: "#38bdf8",
  brandCalculator: "#ff7f00",
  brandCitadel: "rgb(129,174,255)",
  brandWtcPlus: "#ff84cf",
  brandWtcLetter: "#8dacff",
  brandBristol: "#ff535d",
  brandNottingham: "#0098e7",
  brandSpotify: "#1ecc5a",
  brandStudentLoan: "#34d399",
};

export const constants = stylex.defineConsts({
  DARK: "@media (prefers-color-scheme: dark)",
});

export const layout = stylex.defineConsts({
  maxInlineSize: "1140px",
});

export const color = stylex.defineVars({
  colorScheme: {
    default: light.colorScheme,
    [constants.DARK]: dark.colorScheme,
  },

  textMain: { default: light.textMain, [constants.DARK]: dark.textMain },
  textMuted: { default: light.textMuted, [constants.DARK]: dark.textMuted },
  textSubtle: {
    default: light.textSubtle,
    [constants.DARK]: dark.textSubtle,
  },
  textOnActive: {
    default: light.textOnActive,
    [constants.DARK]: dark.textOnActive,
  },
  textOnControlThumb: {
    default: light.textOnControlThumb,
    [constants.DARK]: dark.textOnControlThumb,
  },
  textAccent: {
    default: light.textAccent,
    [constants.DARK]: dark.textAccent,
  },

  backgroundMain: {
    default: light.backgroundMain,
    [constants.DARK]: dark.backgroundMain,
  },
  backgroundRaised: {
    default: light.backgroundRaised,
    [constants.DARK]: dark.backgroundRaised,
  },
  backgroundElevated: {
    default: light.backgroundElevated,
    [constants.DARK]: dark.backgroundElevated,
  },
  backgroundSunken: {
    default: light.backgroundSunken,
    [constants.DARK]: dark.backgroundSunken,
  },
  backgroundHover: {
    default: light.backgroundHover,
    [constants.DARK]: dark.backgroundHover,
  },
  backgroundTranslucent: {
    default: light.backgroundTranslucent,
    [constants.DARK]: dark.backgroundTranslucent,
  },
  backgroundInverse: {
    default: light.backgroundInverse,
    [constants.DARK]: dark.backgroundInverse,
  },
  backgroundMainChannels: {
    default: light.backgroundMainChannels,
    [constants.DARK]: dark.backgroundMainChannels,
  },
  backgroundRaisedChannels: {
    default: light.backgroundRaisedChannels,
    [constants.DARK]: dark.backgroundRaisedChannels,
  },
  backgroundCalculatorButton: {
    default: light.backgroundCalculatorButton,
    [constants.DARK]: dark.backgroundCalculatorButton,
  },
  backgroundCalculatorButtonHover: {
    default: light.backgroundCalculatorButtonHover,
    [constants.DARK]: dark.backgroundCalculatorButtonHover,
  },

  surfaceAccentSubtle: {
    default: light.surfaceAccentSubtle,
    [constants.DARK]: dark.surfaceAccentSubtle,
  },
  surfaceAccentMuted: {
    default: light.surfaceAccentMuted,
    [constants.DARK]: dark.surfaceAccentMuted,
  },
  surfaceInfoSubtle: {
    default: light.surfaceInfoSubtle,
    [constants.DARK]: dark.surfaceInfoSubtle,
  },
  surfaceSuccessSubtle: {
    default: light.surfaceSuccessSubtle,
    [constants.DARK]: dark.surfaceSuccessSubtle,
  },
  surfaceWarningSubtle: {
    default: light.surfaceWarningSubtle,
    [constants.DARK]: dark.surfaceWarningSubtle,
  },
  surfaceDangerSubtle: {
    default: light.surfaceDangerSubtle,
    [constants.DARK]: dark.surfaceDangerSubtle,
  },

  controlTrack: {
    default: light.controlTrack,
    [constants.DARK]: dark.controlTrack,
  },
  controlThumb: {
    default: light.controlThumb,
    [constants.DARK]: dark.controlThumb,
  },
  controlActive: {
    default: light.controlActive,
    [constants.DARK]: dark.controlActive,
  },
  controlActiveHover: {
    default: light.controlActiveHover,
    [constants.DARK]: dark.controlActiveHover,
  },
  controlActiveSubtle: {
    default: light.controlActiveSubtle,
    [constants.DARK]: dark.controlActiveSubtle,
  },

  border: { default: light.border, [constants.DARK]: dark.border },
  borderSubtle: {
    default: light.borderSubtle,
    [constants.DARK]: dark.borderSubtle,
  },
  borderStrong: {
    default: light.borderStrong,
    [constants.DARK]: dark.borderStrong,
  },
  borderAccent: {
    default: light.borderAccent,
    [constants.DARK]: dark.borderAccent,
  },

  opacityActive: {
    default: light.opacityActive,
    [constants.DARK]: dark.opacityActive,
  },

  shadowColor: {
    default: light.shadowColor,
    [constants.DARK]: dark.shadowColor,
  },
  shadowStrength: {
    default: light.shadowStrength,
    [constants.DARK]: dark.shadowStrength,
  },
  shadowAccent: {
    default: light.shadowAccent,
    [constants.DARK]: dark.shadowAccent,
  },

  info: { default: light.info, [constants.DARK]: dark.info },
  infoText: { default: light.infoText, [constants.DARK]: dark.infoText },
  infoOn: { default: light.infoOn, [constants.DARK]: dark.infoOn },
  success: { default: light.success, [constants.DARK]: dark.success },
  successText: {
    default: light.successText,
    [constants.DARK]: dark.successText,
  },
  successOn: { default: light.successOn, [constants.DARK]: dark.successOn },
  warning: { default: light.warning, [constants.DARK]: dark.warning },
  warningText: {
    default: light.warningText,
    [constants.DARK]: dark.warningText,
  },
  warningOn: { default: light.warningOn, [constants.DARK]: dark.warningOn },
  danger: { default: light.danger, [constants.DARK]: dark.danger },
  dangerText: {
    default: light.dangerText,
    [constants.DARK]: dark.dangerText,
  },
  dangerOn: { default: light.dangerOn, [constants.DARK]: dark.dangerOn },

  brandTmdb: { default: light.brandTmdb, [constants.DARK]: dark.brandTmdb },
  brandCalculator: {
    default: light.brandCalculator,
    [constants.DARK]: dark.brandCalculator,
  },
  brandCitadel: {
    default: light.brandCitadel,
    [constants.DARK]: dark.brandCitadel,
  },
  brandWtcPlus: {
    default: light.brandWtcPlus,
    [constants.DARK]: dark.brandWtcPlus,
  },
  brandWtcLetter: {
    default: light.brandWtcLetter,
    [constants.DARK]: dark.brandWtcLetter,
  },
  brandBristol: {
    default: light.brandBristol,
    [constants.DARK]: dark.brandBristol,
  },
  brandNottingham: {
    default: light.brandNottingham,
    [constants.DARK]: dark.brandNottingham,
  },
  brandSpotify: {
    default: light.brandSpotify,
    [constants.DARK]: dark.brandSpotify,
  },
  brandStudentLoan: {
    default: light.brandStudentLoan,
    [constants.DARK]: dark.brandStudentLoan,
  },
});

export const lightTheme = stylex.createTheme(color, light);
export const darkTheme = stylex.createTheme(color, dark);

export const font = stylex.defineVars({
  family: "Inter,Inter-fallback,sans-serif",
  familyMono:
    'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',

  // Static typography - UI elements
  uiDisplay: "3rem",
  uiHeading0: "2rem",
  uiHeading1: "1.5rem",
  uiHeading2: "1.25rem",
  uiHeading3: "1.1rem",
  uiBody: "1rem",
  uiBodySmall: ".85rem",
  uiCaption: ".75rem",
  uiOverline: ".7rem",

  // Viewport-responsive typography landing pages
  vpDisplay: {
    default: "2rem",
    [breakpoints.sm]: "2.8rem",
    [breakpoints.md]: "3.75rem",
    [breakpoints.lg]: "5.25rem",
  },
  vpSubDisplay: {
    default: "1rem",
    [breakpoints.sm]: "1.1rem",
    [breakpoints.md]: "1.3rem",
    [breakpoints.lg]: "1.6rem",
  },
  vpHeading1: {
    default: "1.3rem",
    [breakpoints.sm]: "1.4rem",
    [breakpoints.md]: "1.6rem",
    [breakpoints.lg]: "2rem",
  },
  vpHeading2: {
    default: "1.2rem",
    [breakpoints.sm]: "1.3rem",
    [breakpoints.md]: "1.5rem",
    [breakpoints.lg]: "1.8rem",
  },
  vpHeading3: {
    default: "1rem",
    [breakpoints.sm]: "1.1rem",
    [breakpoints.md]: "1.2rem",
    [breakpoints.lg]: "1.3rem",
  },

  // Container-responsive typography - items inside responsive grids
  cqTitle: {
    default: "clamp(1.1rem, 0.96rem + 1.56cqmin, 1.4rem)",
    [breakpoints.lg]: "1.5rem",
  },

  weight_1: stylex.types.integer(100),
  weight_2: stylex.types.integer(200),
  weight_3: stylex.types.integer(300),
  weight_4: stylex.types.integer(400),
  weight_5: stylex.types.integer(500),
  weight_6: stylex.types.integer(600),
  weight_7: stylex.types.integer(700),
  weight_8: stylex.types.integer(800),
  weight_9: stylex.types.integer(900),

  lineHeight_00: stylex.types.number(0.95),
  lineHeight_0: stylex.types.number(1),
  lineHeight_1: stylex.types.number(1.1),
  lineHeight_2: stylex.types.number(1.2),
  lineHeight_3: stylex.types.number(1.3),
  lineHeight_4: stylex.types.number(1.5),
  lineHeight_5: stylex.types.number(2),

  trackingTight: "-0.025em",
  trackingSnug: "-0.01em",
  trackingNormal: "0",
  trackingWide: "0.025em",
  trackingWider: "0.05em",
  trackingWidest: "0.12em",
});

export const space = stylex.defineVars({
  _00: ".1rem",
  _0: ".25rem",
  _1: ".5rem",
  _2: ".75rem",
  _3: "1rem",
  _4: "1.25rem",
  _5: "1.5rem",
  _6: "1.75rem",
  _7: "2rem",
  _8: "3rem",
  _9: "4rem",
  _10: "5rem",
  _11: "7.5rem",
  _12: "10rem",
  _13: "15rem",
  _14: "20rem",
  _15: "30rem",
  _16: "35rem",
});

export const controlSize = stylex.defineVars({
  _0: { default: "2.4px", [breakpoints.md]: "2px" },
  _1: { default: "4.8px", [breakpoints.md]: "4px" },
  _2: { default: "9.6px", [breakpoints.md]: "8px" },
  _3: { default: "14.4px", [breakpoints.md]: "12px" },
  _4: { default: "19.2px", [breakpoints.md]: "16px" },
  _5: { default: "24px", [breakpoints.md]: "20px" },
  _6: { default: "28.8px", [breakpoints.md]: "24px" },
  _7: { default: "33.6px", [breakpoints.md]: "28px" },
  _8: { default: "38.4px", [breakpoints.md]: "32px" },
  _9: { default: "48px", [breakpoints.md]: "40px" },
});

export const border = stylex.defineVars({
  size_1: "1px",
  size_2: "2px",
  size_3: "5px",
  size_4: "10px",
  size_5: "25px",

  radius_1: ".3rem",
  radius_2: ".5rem",
  radius_3: "1rem",
  radius_4: "2rem",
  radius_5: "3rem",

  radius_round: "1e5px",
});

export const layer = stylex.defineVars({
  background: stylex.types.integer(-100),
  base: stylex.types.integer(0),
  content: stylex.types.integer(100),
  overlay: stylex.types.integer(200),
  header: stylex.types.integer(300),
  tooltip: stylex.types.integer(400),
  toaster: stylex.types.integer(500),
});

export const ratio = stylex.defineVars({
  square: "1",
  golden: "1.618/1",
  tv: "4/3",
  double: "2/1",
  wide: "16/9",
  poster: "2/3",
  portrait: "3/4",
});

export const shadow = stylex.defineVars({
  _1: `0 1px 2px -1px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 9%))`,
  _2: `0 3px 5px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 7px 14px -5px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 5%))`,
  _3: `0 -1px 3px 0 hsl(${color.shadowColor} / calc(${color.shadowStrength} + 2%)), 0 1px 2px -5px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 2%)), 0 2px 5px -5px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 4%)), 0 4px 12px -5px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 5%)), 0 12px 15px -5px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 7%))`,
  _4: `0 -2px 5px 0 hsl(${color.shadowColor} / calc(${color.shadowStrength} + 2%)), 0 1px 1px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 2px 2px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 5px 5px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 4%)), 0 9px 9px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 5%)), 0 16px 16px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 6%))`,
  _5: `0 -1px 2px 0 hsl(${color.shadowColor} / calc(${color.shadowStrength} + 2%)), 0 2px 1px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 5px 5px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 10px 10px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 4%)), 0 20px 20px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 5%)), 0 40px 40px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 7%))`,
  _6: `0 -1px 2px 0 hsl(${color.shadowColor} / calc(${color.shadowStrength} + 2%)), 0 3px 2px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 7px 5px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 3%)), 0 12px 10px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 4%)), 0 22px 18px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 5%)), 0 41px 33px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 6%)), 0 100px 80px -2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 7%))`,

  // Accent-tinted glow shadows for highlighted or interactive surfaces
  glowAccentSoft: `0 4px 16px -2px ${color.shadowAccent}`,
  glowAccent: `0 0 0 1px ${color.borderAccent}, 0 8px 28px -4px ${color.shadowAccent}`,
  glowAccentStrong: `0 0 0 1px ${color.borderAccent}, 0 4px 12px -2px ${color.shadowAccent}, 0 16px 40px -4px ${color.shadowAccent}`,

  // Inset shadow for sunken/inset surfaces
  inset: `inset 0 1px 2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 6%))`,
});

export const gradient = stylex.defineVars({
  // Surface gradients — subtle vertical sheens for raised surfaces
  surfaceSubtle: `linear-gradient(180deg, ${color.backgroundElevated} 0%, ${color.backgroundRaised} 100%)`,
  surfaceRaised: `linear-gradient(180deg, ${color.backgroundRaised} 0%, ${color.backgroundMain} 100%)`,

  // Accent gradients — directional purple-to-magenta sweeps
  accent: `linear-gradient(135deg, ${color.controlActive} 0%, ${color.controlActiveHover} 100%)`,
  accentSoft: `linear-gradient(135deg, ${color.surfaceAccentSubtle} 0%, ${color.surfaceAccentMuted} 100%)`,
  accentRadial: `radial-gradient(circle at 30% 0%, ${color.controlActive} 0%, transparent 60%)`,

  // Aurora — multi-stop decorative gradient for hero/feature sections
  aurora: `linear-gradient(135deg, ${color.controlActive} 0%, ${color.info} 50%, ${color.controlActiveHover} 100%)`,
  auroraSoft: `linear-gradient(135deg, ${color.surfaceAccentSubtle} 0%, ${color.surfaceInfoSubtle} 50%, ${color.surfaceAccentMuted} 100%)`,

  // Spotlight — radial highlight for emphasized cards
  spotlight: `radial-gradient(ellipse at top, ${color.surfaceAccentSubtle} 0%, transparent 70%)`,

  // Border gradients — for borders that need a directional color
  borderAccent: `linear-gradient(135deg, ${color.controlActive} 0%, ${color.info} 100%)`,
});
