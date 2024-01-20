import * as stylex from "@stylexjs/stylex";

const DARK = "@media (prefers-color-scheme: dark)";

const lightThemeTokens = {
  textMain: "#292929",
  textMuted: "#505050",
  backgroundMain: "#f3eded",
  backgroundRaised: "#f7f1f1",
  backgroundHover: "#e6dddd",
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
  shadowHighlight: "0 0 0 0.3rem rgba(0,0,0,0.07)",
  svgSwitch: "",
  svgDefault: "",
  svgHover: "",
  spotifyLogoFill: "#1ecc5a",
  ...lightThemeTokens,
});

const darkThemeTokens = {
  textMain: "#f3eded",
  textMuted: "#bbbbbb",
  backgroundMain: "#292929",
  backgroundRaised: "#414141",
  backgroundHover: "#535353",
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
});
