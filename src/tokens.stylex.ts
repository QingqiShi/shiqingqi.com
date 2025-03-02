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

  controlTrack: "#ccc5c5",
  controlThumb: "#ffffff",
  controlActive: "#7e10c2",
  controlActiveHover: "#9e2de3",

  opacityActive: "0.1",

  shadowColor: "220 3% 15%",
  shadowStrength: "1%",

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

  controlTrack: "#414141",
  controlThumb: "#bbbbbb",
  controlActive: "#933bc9",
  controlActiveHover: "#a751db",

  opacityActive: "0.2",

  shadowColor: "220 40% 2%",
  shadowStrength: "25%",

  brandCitadel: "rgb(129,174,255)",
  brandWtcPlus: "#ff84cf",
  brandWtcLetter: "#8dacff",
  brandBristol: "#ff535d",
  brandNottingham: "#0098e7",
  brandSpotify: "#1ecc5a",
};

const DARK = "@media (prefers-color-scheme: dark)";

export const color = stylex.defineVars({
  colorScheme: { default: light.colorScheme, [DARK]: dark.colorScheme },

  textMain: { default: light.textMain, [DARK]: dark.textMain },
  textMuted: { default: light.textMuted, [DARK]: dark.textMuted },
  textOnActive: { default: light.textOnActive, [DARK]: dark.textOnActive },
  textOnControlThumb: {
    default: light.textOnControlThumb,
    [DARK]: dark.textOnControlThumb,
  },

  backgroundMain: {
    default: light.backgroundMain,
    [DARK]: dark.backgroundMain,
  },
  backgroundRaised: {
    default: light.backgroundRaised,
    [DARK]: dark.backgroundRaised,
  },
  backgroundHover: {
    default: light.backgroundHover,
    [DARK]: dark.backgroundHover,
  },
  backgroundTranslucent: {
    default: light.backgroundTranslucent,
    [DARK]: dark.backgroundTranslucent,
  },
  backgroundMainChannels: {
    default: light.backgroundMainChannels,
    [DARK]: dark.backgroundMainChannels,
  },

  controlTrack: { default: light.controlTrack, [DARK]: dark.controlTrack },
  controlThumb: { default: light.controlThumb, [DARK]: dark.controlThumb },
  controlActive: { default: light.controlActive, [DARK]: dark.controlActive },
  controlActiveHover: {
    default: light.controlActiveHover,
    [DARK]: dark.controlActiveHover,
  },

  opacityActive: { default: light.opacityActive, [DARK]: dark.opacityActive },

  shadowColor: { default: light.shadowColor, [DARK]: dark.shadowColor },
  shadowStrength: {
    default: light.shadowStrength,
    [DARK]: dark.shadowStrength,
  },

  brandCitadel: { default: light.brandCitadel, [DARK]: dark.brandCitadel },
  brandWtcPlus: { default: light.brandWtcPlus, [DARK]: dark.brandWtcPlus },
  brandWtcLetter: {
    default: light.brandWtcLetter,
    [DARK]: dark.brandWtcLetter,
  },
  brandBristol: { default: light.brandBristol, [DARK]: dark.brandBristol },
  brandNottingham: {
    default: light.brandNottingham,
    [DARK]: dark.brandNottingham,
  },
  brandSpotify: {
    default: light.brandSpotify,
    [DARK]: dark.brandSpotify,
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

  weight_1: 100,
  weight_2: 200,
  weight_3: 300,
  weight_4: 400,
  weight_5: 500,
  weight_6: 600,
  weight_7: 700,
  weight_8: 800,
  weight_9: 900,

  lineHeight_00: 0.95,
  lineHeight_0: 1,
  lineHeight_1: 1.1,
  lineHeight_2: 1.2,
  lineHeight_3: 1.3,
  lineHeight_4: 1.5,
  lineHeight_5: 2,
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
  background: -100,
  base: 0,
  content: 100,
  overlay: 200,
  header: 300,
  tooltip: 400,
  toaster: 500,
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
