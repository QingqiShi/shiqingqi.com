import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";

const light = {
  colorScheme: "light",

  textMain: "#292929",
  textMuted: "#505050",
  textOnActive: "#ffffff",
  textOnControlThumb: "#292929",

  backgroundMain: "#ffffff",
  backgroundRaised: "#ebe4e5",
  backgroundHover: "#e6dddd",
  backgroundTranslucent: "rgba(0, 0, 0, 0.01)",
  backgroundMainChannels: "255,255,255",
  backgroundGlass: "rgba(235, 228, 229, 0.7)",

  controlTrack: "#ccc5c5",
  controlThumb: "#ffffff",
  controlActive: "#7e10c2",
  controlActiveHover: "#9e2de3",

  opacityActive: "0.1",

  shadowColor: "220 3% 15%",
  shadowStrength: "1%",
  shadowGlass:
    "0 -2px 5px 0 hsl(220 3% 15% / calc(1% + 2%)), 0 1px 1px -2px hsl(220 3% 15% / calc(1% + 3%)), 0 2px 2px -2px hsl(220 3% 15% / calc(1% + 3%)), 0 5px 5px -2px hsl(220 3% 15% / calc(1% + 4%)), 0 9px 9px -2px hsl(220 3% 15% / calc(1% + 5%)), 0 16px 16px -2px hsl(220 3% 15% / calc(1% + 6%))",

  brandTmdb: "#4a7957",
  brandCitadel: "rgb(26,54,104)",
  brandWtcPlus: "#e661b2",
  brandWtcLetter: "#0a47ed",
  brandBristol: "#bf2f38",
  brandNottingham: "#005480",
  brandSpotify: "#1ecc5a",
};

const dark: { [key in keyof typeof light]: string } = {
  colorScheme: "dark",

  textMain: "#f3eded",
  textMuted: "#bbbbbb",
  textOnActive: "#ffffff",
  textOnControlThumb: "#000000",

  backgroundMain: "#000000",
  backgroundRaised: "#414141",
  backgroundHover: "#535353",
  backgroundTranslucent: "rgba(255, 255, 255, 0.1)",
  backgroundMainChannels: "0,0,0",
  backgroundGlass: "rgba(65, 65, 65, 0.6)",

  controlTrack: "#414141",
  controlThumb: "#bbbbbb",
  controlActive: "#933bc9",
  controlActiveHover: "#a751db",

  opacityActive: "0.2",

  shadowColor: "220 40% 2%",
  shadowStrength: "25%",
  shadowGlass: "none",

  brandTmdb: "#90cea1",
  brandCitadel: "rgb(129,174,255)",
  brandWtcPlus: "#ff84cf",
  brandWtcLetter: "#8dacff",
  brandBristol: "#ff535d",
  brandNottingham: "#0098e7",
  brandSpotify: "#1ecc5a",
};

export const constants = stylex.defineConsts({
  DARK: "@media (prefers-color-scheme: dark)",
});

export const color = stylex.defineVars({
  colorScheme: {
    default: light.colorScheme,
    [constants.DARK]: dark.colorScheme,
  },

  textMain: { default: light.textMain, [constants.DARK]: dark.textMain },
  textMuted: { default: light.textMuted, [constants.DARK]: dark.textMuted },
  textOnActive: {
    default: light.textOnActive,
    [constants.DARK]: dark.textOnActive,
  },
  textOnControlThumb: {
    default: light.textOnControlThumb,
    [constants.DARK]: dark.textOnControlThumb,
  },

  backgroundMain: {
    default: light.backgroundMain,
    [constants.DARK]: dark.backgroundMain,
  },
  backgroundRaised: {
    default: light.backgroundRaised,
    [constants.DARK]: dark.backgroundRaised,
  },
  backgroundHover: {
    default: light.backgroundHover,
    [constants.DARK]: dark.backgroundHover,
  },
  backgroundTranslucent: {
    default: light.backgroundTranslucent,
    [constants.DARK]: dark.backgroundTranslucent,
  },
  backgroundMainChannels: {
    default: light.backgroundMainChannels,
    [constants.DARK]: dark.backgroundMainChannels,
  },
  backgroundGlass: {
    default: light.backgroundGlass,
    [DARK]: dark.backgroundGlass,
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
  shadowGlass: { default: light.shadowGlass, [DARK]: dark.shadowGlass },

  brandTmdb: { default: light.brandTmdb, [constants.DARK]: dark.brandTmdb },
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
});

export const lightTheme = stylex.createTheme(color, light);
export const darkTheme = stylex.createTheme(color, dark);

export const font = stylex.defineVars({
  family: "Inter,Inter-fallback,sans-serif",

  size_00: ".6rem",
  size_0: ".8rem",
  size_1: "1rem",
  size_2: "1.1rem",
  size_3: "1.25rem",
  size_4: "1.5rem",
  size_5: "2rem",
  size_6: "2.5rem",
  size_7: "3rem",
  size_8: "3.5rem",

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
});

export const backdropEffects = stylex.defineVars({
  controls: "saturate(180%) blur(16px)",
  border: "saturate(80%) brightness(1.2) blur(6px)",
});

// 3px 5px 13px 0px rgba(0, 0, 0, 0.2)
