import * as stylex from "@stylexjs/stylex";
import type { Breakpoints } from "./types";

const DARK = "@media (prefers-color-scheme: dark)";

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const md: Breakpoints["md"] =
  "@media (min-width: 768px) and (max-width: 1079px)";
const lg: Breakpoints["lg"] =
  "@media (min-width: 1080px) and (max-width: 1999px)";
const minLg: Breakpoints["minLg"] = "@media (min-width: 1080px)";
const minXl: Breakpoints["minXl"] = "@media (min-width: 2000px)";

const lightThemeTokens = {
  textMain: "#292929",
  textMuted: "#505050",
  backgroundMain: "#ffffff",
  backgroundRaised: "#f7f1f1",
  backgroundHover: "#e6dddd",
  backgroundTranslucent: "rgba(0, 0, 0, 0.01)",
  controlTrack: "#ccc5c5",
  controlThumb: "#ffffff",
  controlActive: "#7e10c2",
  textOnActive: "#ffffff",
  colorScheme: "light",
  citadelLogoFill: "rgb(26,54,104)",
  wtcLogoPlusFill: "#e661b2",
  wtcLogoLetterFill: "#0a47ed",
  bristolLogoFill: "#bf2f38",
  nottinghamLogoFill: "#005480",
  maskBlendMode: "screen",
  maskOpacity: "0.8",
  glowOpacity: "0.1",
};

export const tokens = stylex.defineVars({
  fontFamily: "Inter,Inter-fallback,sans-serif",
  shadowNone: "0 0 0 rgba(0,0,0,0),0 0 0 rgba(0,0,0,0)",
  shadowRaised: `0.09375rem 0.11875rem 0.21875rem rgba(0,0,0,0.02),
    0.225rem 0.28125rem 0.525rem rgba(0,0,0,0.028),
    0.425rem 0.53125rem 0.99375rem rgba(0,0,0,0.035),
    0.75625rem 0.95rem 1.775rem rgba(0,0,0,0.042),
    1.4125rem 1.775rem 3.31875rem rgba(0,0,0,0.05),
    3.375rem 4.25rem 7.9375rem rgba(0,0,0,0.07)`,
  shadowControls: `0 0.00625rem 0.01875rem rgba(0,0,0,0.02),
    0 0.0125rem 0.04375rem rgba(0,0,0,0.028),
    0 0.025rem 0.0875rem rgba(0,0,0,0.035),
    0 0.04375rem 0.15625rem rgba(0,0,0,0.042),
    0 0.08125rem 0.2875rem rgba(0,0,0,0.05),
    0 0.1875rem 0.6875rem rgba(0,0,0,0.07)`,
  shadowHighlight: "0 0 0 5px rgba(0,0,0,0.07)",
  svgSwitch: "",
  svgDefault: "",
  svgHover: "",
  spotifyLogoFill: "#1ecc5a",
  layoutPaddingBase: {
    default: "1rem",
    [sm]: "1.2rem",
    [md]: "1.4rem",
    [minLg]: "1.7rem",
  },
  layoutMaskRadius: {
    default: "540px",
    [sm]: "700px",
    [md]: "850px",
    [lg]: "1300px",
    [minXl]: "2000px",
  },
  ...lightThemeTokens,
});

const darkThemeTokens = {
  textMain: "#f3eded",
  textMuted: "#bbbbbb",
  backgroundMain: "#000000",
  backgroundRaised: "#414141",
  backgroundHover: "#535353",
  backgroundTranslucent: "rgba(255, 255, 255, 0.1)",
  controlTrack: "#414141",
  controlThumb: "#bbbbbb",
  controlActive: "#933bc9",
  textOnActive: "#ffffff",
  colorScheme: "dark",
  citadelLogoFill: "rgb(129,174,255)",
  wtcLogoPlusFill: "#ff84cf",
  wtcLogoLetterFill: "#8dacff",
  bristolLogoFill: "#ff535d",
  nottinghamLogoFill: "#0098e7",
  maskBlendMode: "multiply",
  maskOpacity: "0.7",
  glowOpacity: "0.2",
};

export const darkTheme = stylex.createTheme(tokens, darkThemeTokens);

export const systemTheme = stylex.createTheme(tokens, {
  textMain: {
    default: lightThemeTokens.textMain,
    [DARK]: darkThemeTokens.textMain,
  },
  textMuted: {
    default: lightThemeTokens.textMuted,
    [DARK]: darkThemeTokens.textMuted,
  },
  backgroundMain: {
    default: lightThemeTokens.backgroundMain,
    [DARK]: darkThemeTokens.backgroundMain,
  },
  backgroundRaised: {
    default: lightThemeTokens.backgroundRaised,
    [DARK]: darkThemeTokens.backgroundRaised,
  },
  backgroundHover: {
    default: lightThemeTokens.backgroundHover,
    [DARK]: darkThemeTokens.backgroundHover,
  },
  backgroundTranslucent: {
    default: lightThemeTokens.backgroundTranslucent,
    [DARK]: darkThemeTokens.backgroundTranslucent,
  },
  controlTrack: {
    default: lightThemeTokens.controlTrack,
    [DARK]: darkThemeTokens.controlTrack,
  },
  controlThumb: {
    default: lightThemeTokens.controlThumb,
    [DARK]: darkThemeTokens.controlThumb,
  },
  controlActive: {
    default: lightThemeTokens.controlActive,
    [DARK]: darkThemeTokens.controlActive,
  },
  textOnActive: {
    default: lightThemeTokens.textOnActive,
    [DARK]: darkThemeTokens.textOnActive,
  },
  colorScheme: {
    default: lightThemeTokens.colorScheme,
    [DARK]: darkThemeTokens.colorScheme,
  },
  citadelLogoFill: {
    default: lightThemeTokens.citadelLogoFill,
    [DARK]: darkThemeTokens.citadelLogoFill,
  },
  wtcLogoPlusFill: {
    default: lightThemeTokens.wtcLogoPlusFill,
    [DARK]: darkThemeTokens.wtcLogoPlusFill,
  },
  wtcLogoLetterFill: {
    default: lightThemeTokens.wtcLogoLetterFill,
    [DARK]: darkThemeTokens.wtcLogoLetterFill,
  },
  bristolLogoFill: {
    default: lightThemeTokens.bristolLogoFill,
    [DARK]: darkThemeTokens.bristolLogoFill,
  },
  nottinghamLogoFill: {
    default: lightThemeTokens.nottinghamLogoFill,
    [DARK]: darkThemeTokens.nottinghamLogoFill,
  },
  maskBlendMode: {
    default: lightThemeTokens.maskBlendMode,
    [DARK]: darkThemeTokens.maskBlendMode,
  },
  maskOpacity: {
    default: lightThemeTokens.maskOpacity,
    [DARK]: darkThemeTokens.maskOpacity,
  },
  glowOpacity: {
    default: lightThemeTokens.glowOpacity,
    [DARK]: darkThemeTokens.glowOpacity,
  },
});
