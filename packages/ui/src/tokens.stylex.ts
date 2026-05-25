import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "./breakpoints.stylex.ts";

const light = {
  colorScheme: "light",

  textMain: "#292929",
  textMuted: "#505050",
  textSubtle: "#737373",
  accentOn: "#ffffff",
  textOnBright: "#292929",
  accentText: "#6b0fa7",

  background: "#edece8",
  backgroundDim: "#e6e5e1",
  background1: "#f4f3ef",
  background2: "#f9f8f4",
  background3: "#fcfbf7",
  background4: "#fefdf9",
  background5: "#fffefa",
  backgroundChannels: "237,236,232",
  background1Channels: "244,243,239",

  surfaceAccentSubtle: "rgba(126, 16, 194, 0.08)",
  surfaceAccentMuted: "rgba(126, 16, 194, 0.16)",
  surfaceInfoSubtle: "rgba(2, 132, 199, 0.1)",
  surfaceSuccessSubtle: "rgba(22, 163, 74, 0.1)",
  surfaceWarningSubtle: "rgba(217, 119, 6, 0.12)",
  surfaceDangerSubtle: "rgba(220, 38, 38, 0.1)",

  surfaceBright: "#ffffff",
  accent: "#7e10c2",
  accentHover: "#9e2de3",

  neutral: "#cccccc",
  neutralHover: "#b3b3b3",
  surfaceNeutralSubtle: "#e0e0e0",
  neutralText: "#505050",
  neutralOn: "#292929",

  accentBorder: "rgba(126, 16, 194, 0.4)",
  infoBorder: "rgba(2, 132, 199, 0.4)",
  successBorder: "rgba(22, 163, 74, 0.4)",
  warningBorder: "rgba(217, 119, 6, 0.4)",
  dangerBorder: "rgba(220, 38, 38, 0.4)",
  neutralBorder: "#e0e0e0",

  opacityActive: "0.1",

  shadowColor: "220 3% 15%",
  shadowStrength: "1%",

  // Semantic colors — bold (foreground), hover (interactive lift), subtle (background tint), text (on subtle), on (on bold)
  info: "#0284c7",
  infoHover: "#0ea5e9",
  infoText: "#075985",
  infoOn: "#ffffff",
  success: "#16a34a",
  successHover: "#22c55e",
  successText: "#14532d",
  successOn: "#ffffff",
  warning: "#d97706",
  warningHover: "#f59e0b",
  warningText: "#78350f",
  warningOn: "#ffffff",
  danger: "#dc2626",
  dangerHover: "#ef4444",
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
  brandPixelCreatureCreator: "#a855f7",
};

const dark: { [key in keyof typeof light]: string } = {
  colorScheme: "dark",

  textMain: "#f3eded",
  textMuted: "#bbbbbb",
  textSubtle: "#8a8a8a",
  accentOn: "#ffffff",
  textOnBright: "#000000",
  accentText: "#c794ec",

  background: "#000000",
  backgroundDim: "#050505",
  background1: "#111111",
  background2: "#151515",
  background3: "#191919",
  background4: "#1d1d1d",
  background5: "#212121",
  backgroundChannels: "0,0,0",
  background1Channels: "17,17,17",

  surfaceAccentSubtle: "rgba(199, 148, 236, 0.12)",
  surfaceAccentMuted: "rgba(199, 148, 236, 0.2)",
  surfaceInfoSubtle: "rgba(56, 189, 248, 0.14)",
  surfaceSuccessSubtle: "rgba(74, 222, 128, 0.14)",
  surfaceWarningSubtle: "rgba(251, 191, 36, 0.16)",
  surfaceDangerSubtle: "rgba(248, 113, 113, 0.14)",

  surfaceBright: "#bbbbbb",
  accent: "#933bc9",
  accentHover: "#a751db",

  neutral: "#4a4a4a",
  neutralHover: "#5a5a5a",
  surfaceNeutralSubtle: "#1c1c1c",
  neutralText: "#bbbbbb",
  neutralOn: "#f3eded",

  accentBorder: "rgba(199, 148, 236, 0.4)",
  infoBorder: "rgba(56, 189, 248, 0.4)",
  successBorder: "rgba(74, 222, 128, 0.4)",
  warningBorder: "rgba(251, 191, 36, 0.4)",
  dangerBorder: "rgba(248, 113, 113, 0.4)",
  neutralBorder: "#333333",

  opacityActive: "0.2",

  shadowColor: "220 40% 2%",
  shadowStrength: "25%",

  info: "#38bdf8",
  infoHover: "#7dd3fc",
  infoText: "#bae6fd",
  infoOn: "#082f49",
  success: "#4ade80",
  successHover: "#86efac",
  successText: "#bbf7d0",
  successOn: "#052e16",
  warning: "#fbbf24",
  warningHover: "#fcd34d",
  warningText: "#fde68a",
  warningOn: "#451a03",
  danger: "#f87171",
  dangerHover: "#fca5a5",
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
  brandPixelCreatureCreator: "#c084fc",
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
  accentOn: {
    default: light.accentOn,
    [constants.DARK]: dark.accentOn,
  },
  textOnBright: {
    default: light.textOnBright,
    [constants.DARK]: dark.textOnBright,
  },
  accentText: {
    default: light.accentText,
    [constants.DARK]: dark.accentText,
  },

  background: {
    default: light.background,
    [constants.DARK]: dark.background,
  },
  backgroundDim: {
    default: light.backgroundDim,
    [constants.DARK]: dark.backgroundDim,
  },
  background1: {
    default: light.background1,
    [constants.DARK]: dark.background1,
  },
  background2: {
    default: light.background2,
    [constants.DARK]: dark.background2,
  },
  background3: {
    default: light.background3,
    [constants.DARK]: dark.background3,
  },
  background4: {
    default: light.background4,
    [constants.DARK]: dark.background4,
  },
  background5: {
    default: light.background5,
    [constants.DARK]: dark.background5,
  },
  backgroundChannels: {
    default: light.backgroundChannels,
    [constants.DARK]: dark.backgroundChannels,
  },
  background1Channels: {
    default: light.background1Channels,
    [constants.DARK]: dark.background1Channels,
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

  surfaceBright: {
    default: light.surfaceBright,
    [constants.DARK]: dark.surfaceBright,
  },
  accent: {
    default: light.accent,
    [constants.DARK]: dark.accent,
  },
  accentHover: {
    default: light.accentHover,
    [constants.DARK]: dark.accentHover,
  },

  neutral: { default: light.neutral, [constants.DARK]: dark.neutral },
  neutralHover: {
    default: light.neutralHover,
    [constants.DARK]: dark.neutralHover,
  },
  surfaceNeutralSubtle: {
    default: light.surfaceNeutralSubtle,
    [constants.DARK]: dark.surfaceNeutralSubtle,
  },
  neutralText: {
    default: light.neutralText,
    [constants.DARK]: dark.neutralText,
  },
  neutralOn: {
    default: light.neutralOn,
    [constants.DARK]: dark.neutralOn,
  },

  accentBorder: {
    default: light.accentBorder,
    [constants.DARK]: dark.accentBorder,
  },
  infoBorder: {
    default: light.infoBorder,
    [constants.DARK]: dark.infoBorder,
  },
  successBorder: {
    default: light.successBorder,
    [constants.DARK]: dark.successBorder,
  },
  warningBorder: {
    default: light.warningBorder,
    [constants.DARK]: dark.warningBorder,
  },
  dangerBorder: {
    default: light.dangerBorder,
    [constants.DARK]: dark.dangerBorder,
  },
  neutralBorder: {
    default: light.neutralBorder,
    [constants.DARK]: dark.neutralBorder,
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

  info: { default: light.info, [constants.DARK]: dark.info },
  infoHover: { default: light.infoHover, [constants.DARK]: dark.infoHover },
  infoText: { default: light.infoText, [constants.DARK]: dark.infoText },
  infoOn: { default: light.infoOn, [constants.DARK]: dark.infoOn },
  success: { default: light.success, [constants.DARK]: dark.success },
  successHover: {
    default: light.successHover,
    [constants.DARK]: dark.successHover,
  },
  successText: {
    default: light.successText,
    [constants.DARK]: dark.successText,
  },
  successOn: { default: light.successOn, [constants.DARK]: dark.successOn },
  warning: { default: light.warning, [constants.DARK]: dark.warning },
  warningHover: {
    default: light.warningHover,
    [constants.DARK]: dark.warningHover,
  },
  warningText: {
    default: light.warningText,
    [constants.DARK]: dark.warningText,
  },
  warningOn: { default: light.warningOn, [constants.DARK]: dark.warningOn },
  danger: { default: light.danger, [constants.DARK]: dark.danger },
  dangerHover: {
    default: light.dangerHover,
    [constants.DARK]: dark.dangerHover,
  },
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
  brandPixelCreatureCreator: {
    default: light.brandPixelCreatureCreator,
    [constants.DARK]: dark.brandPixelCreatureCreator,
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

  // Inset shadow for sunken/inset surfaces
  inset: `inset 0 1px 2px hsl(${color.shadowColor} / calc(${color.shadowStrength} + 6%))`,
});
