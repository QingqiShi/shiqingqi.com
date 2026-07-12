import * as stylex from "@stylexjs/stylex";
import { cyan, cyan_rgb } from "./_generated/palette/hues/cyan.stylex.ts";
import { gray } from "./_generated/palette/hues/gray.stylex.ts";
import { green, green_rgb } from "./_generated/palette/hues/green.stylex.ts";
import { indigo } from "./_generated/palette/hues/indigo.stylex.ts";
import { orange, orange_rgb } from "./_generated/palette/hues/orange.stylex.ts";
import { pink } from "./_generated/palette/hues/pink.stylex.ts";
import { purple, purple_rgb } from "./_generated/palette/hues/purple.stylex.ts";
import { red, red_rgb } from "./_generated/palette/hues/red.stylex.ts";
import { yellow, yellow_rgb } from "./_generated/palette/hues/yellow.stylex.ts";
import { breakpoints } from "./breakpoints.stylex.ts";

// Background tokens are organised by role rather than tonal step:
//
// • Page (bgCanvas/bgCanvasSubtle)      — app shell and scaffolding
// • Surface (bgSurface/Raised/Sunken/Bright) — cards and panels
// • Interactive (bgInteractive*)        — buttons, list rows, menu items
// • Intent (surfaceAccent/Info/...)     — tonal tints carrying meaning
// • Inverse (bgInverse)                 — tooltips and snackbars
// • Overlay (bgOverlay/bgScrim)         — popovers and modal dim layer
//
// Translucent surfaces compose `rgba()` strings using the `<hue>_rgb` group
// (comma-separated channels per tone). CSS does lexical substitution, so
// `rgba(var(--gray_rgb_92), 0.4)` evaluates to `rgba(233,232,228, 0.4)` at
// paint time.
//
// Theming: each var in the `color` group below is a single constant
// `light-dark(<light>, <dark>)` value that resolves against the element's
// `color-scheme`. The root defaults to `color-scheme: light dark` (follow the
// OS), and forcing a theme just pins `color-scheme: light` or `dark` — see
// `getDocumentClassName` in apps/web. No per-theme stylesheets are generated.
//
// To change a token's palette mapping, edit the entry below. To change palette
// values themselves, edit `packages/system-palette-codegen/src/source.ts` and run
// `pnpm codegen:palette`.

const light = {
  // Text
  textMain: gray._20,
  textMuted: gray._40,
  textSubtle: gray._50,
  accentOn: gray._100,
  textOnBright: gray._20,
  textOnInverse: gray._92,
  accentText: purple._30,

  // Page — app shell, scaffolding behind everything. *Fade is the color
  // translucent gradients blend toward (consumed via color-mix()).
  bgCanvas: gray._97,
  bgCanvasSubtle: gray._99,
  bgCanvasFade: gray._92,

  // Surface — cards, panels, dialog bodies
  bgSurface: gray._100,
  bgSurfaceRaised: gray._100,
  bgSurfaceSunken: gray._98,
  bgSurfaceBright: gray._100,
  bgSurfaceFade: gray._95,

  // Interactive — shared by buttons, list rows, menu items
  bgInteractiveRest: gray._100,
  bgInteractiveHover: gray._97,
  bgInteractivePressed: gray._92,
  bgInteractiveSelected: gray._90,
  bgInteractiveDisabled: gray._95,

  // Intent surface tints — alpha is fixed, color comes from the palette.
  surfaceNeutralSubtle: gray._90,
  surfaceAccentSubtle: `rgba(${purple_rgb._30}, 0.08)`,
  surfaceAccentMuted: `rgba(${purple_rgb._30}, 0.16)`,
  surfaceInfoSubtle: `rgba(${cyan_rgb._50}, 0.1)`,
  surfaceSuccessSubtle: `rgba(${green_rgb._50}, 0.1)`,
  surfaceWarningSubtle: `rgba(${orange_rgb._50}, 0.12)`,
  surfaceDangerSubtle: `rgba(${red_rgb._50}, 0.1)`,

  // Inverse — flips theme to grab attention (tooltips, snackbars)
  bgInverse: gray._20,

  // Overlay — popover surface + scrim behind modals
  bgOverlay: gray._100,
  bgScrim: "rgba(0, 0, 0, 0.7)",

  accent: purple._30,
  accentHover: purple._40,
  // Accent at ambient-glow strength (was `accent` + a themed opacity token).
  accentGlow: `rgba(${purple_rgb._30}, 0.1)`,

  // Mid-tone neutrals for chrome / dividers / chips
  neutral: gray._80,
  neutralHover: gray._70,
  neutralText: gray._40,
  neutralOn: gray._20,

  // Translucent borders — same recipe as surface*: palette hue + fixed alpha.
  accentBorder: `rgba(${purple_rgb._30}, 0.4)`,
  infoBorder: `rgba(${cyan_rgb._50}, 0.4)`,
  successBorder: `rgba(${green_rgb._50}, 0.4)`,
  warningBorder: `rgba(${orange_rgb._50}, 0.4)`,
  dangerBorder: `rgba(${red_rgb._50}, 0.4)`,
  neutralBorder: gray._90,

  // Semantic colors — bold (foreground), hover (interactive lift), text, on
  info: cyan._50,
  infoHover: cyan._60,
  infoText: cyan._30,
  infoOn: gray._100,
  success: green._50,
  successHover: green._60,
  successText: green._30,
  successOn: gray._100,
  warning: orange._50,
  warningHover: orange._60,
  warningText: orange._30,
  warningOn: gray._100,
  danger: red._50,
  dangerHover: red._60,
  dangerText: red._20,
  dangerOn: gray._100,

  // Brand colors — nearest system-palette swatch. External brands (Spotify,
  // TMDB, etc.) get the closest match; minor drift from each brand's exact
  // identity color is accepted in exchange for palette consistency.
  brandTmdb: cyan._60,
  brandCalculator: orange._50,
  brandCitadel: indigo._30,
  brandWtcPlus: pink._60,
  brandWtcLetter: indigo._40,
  brandBristol: pink._30,
  brandNottingham: cyan._30,
  brandSpotify: green._60,
  brandStudentLoan: green._50,
  brandPixelCreatureCreator: purple._50,
};

const dark: { [key in keyof typeof light]: string } = {
  textMain: gray._92,
  textMuted: gray._80,
  textSubtle: gray._60,
  accentOn: gray._100,
  textOnBright: gray._0,
  textOnInverse: gray._20,
  accentText: purple._70,

  bgCanvas: gray._0,
  bgCanvasSubtle: gray._2,
  bgCanvasFade: gray._0,

  bgSurface: gray._5,
  bgSurfaceRaised: gray._7,
  bgSurfaceSunken: gray._2,
  bgSurfaceBright: gray._80,
  bgSurfaceFade: gray._5,

  bgInteractiveRest: gray._7,
  bgInteractiveHover: gray._13,
  bgInteractivePressed: gray._11,
  bgInteractiveSelected: gray._9,
  bgInteractiveDisabled: gray._5,

  surfaceNeutralSubtle: gray._7,
  surfaceAccentSubtle: `rgba(${purple_rgb._80}, 0.12)`,
  surfaceAccentMuted: `rgba(${purple_rgb._80}, 0.2)`,
  surfaceInfoSubtle: `rgba(${cyan_rgb._70}, 0.14)`,
  surfaceSuccessSubtle: `rgba(${green_rgb._70}, 0.14)`,
  surfaceWarningSubtle: `rgba(${yellow_rgb._60}, 0.16)`,
  surfaceDangerSubtle: `rgba(${red_rgb._80}, 0.14)`,

  bgInverse: gray._92,
  bgOverlay: gray._7,
  bgScrim: "rgba(0, 0, 0, 0.7)",

  accent: purple._50,
  accentHover: purple._60,
  accentGlow: `rgba(${purple_rgb._50}, 0.2)`,

  neutral: gray._40,
  neutralHover: gray._50,
  neutralText: gray._80,
  neutralOn: gray._92,

  accentBorder: `rgba(${purple_rgb._80}, 0.4)`,
  infoBorder: `rgba(${cyan_rgb._70}, 0.4)`,
  successBorder: `rgba(${green_rgb._70}, 0.4)`,
  warningBorder: `rgba(${yellow_rgb._60}, 0.4)`,
  dangerBorder: `rgba(${red_rgb._60}, 0.4)`,
  neutralBorder: gray._20,

  info: cyan._70,
  infoHover: cyan._80,
  infoText: cyan._90,
  infoOn: cyan._20,
  success: green._60,
  successHover: green._70,
  successText: green._80,
  successOn: green._13,
  warning: yellow._60,
  warningHover: yellow._70,
  warningText: yellow._70,
  warningOn: orange._20,
  danger: red._60,
  dangerHover: red._70,
  dangerText: red._70,
  dangerOn: red._7,

  brandTmdb: cyan._70,
  brandCalculator: orange._50,
  brandCitadel: indigo._70,
  brandWtcPlus: pink._60,
  brandWtcLetter: indigo._70,
  brandBristol: pink._50,
  brandNottingham: cyan._60,
  brandSpotify: green._60,
  brandStudentLoan: green._60,
  brandPixelCreatureCreator: purple._70,
};

export const constants = stylex.defineConsts({
  DARK: "@media (prefers-color-scheme: dark)",
});

export const layout = stylex.defineConsts({
  maxInlineSize: "1140px",
});

export const color = stylex.defineVars({
  textMain: `light-dark(${light.textMain}, ${dark.textMain})`,
  textMuted: `light-dark(${light.textMuted}, ${dark.textMuted})`,
  textSubtle: `light-dark(${light.textSubtle}, ${dark.textSubtle})`,
  accentOn: `light-dark(${light.accentOn}, ${dark.accentOn})`,
  textOnBright: `light-dark(${light.textOnBright}, ${dark.textOnBright})`,
  textOnInverse: `light-dark(${light.textOnInverse}, ${dark.textOnInverse})`,
  accentText: `light-dark(${light.accentText}, ${dark.accentText})`,

  bgCanvas: `light-dark(${light.bgCanvas}, ${dark.bgCanvas})`,
  bgCanvasSubtle: `light-dark(${light.bgCanvasSubtle}, ${dark.bgCanvasSubtle})`,
  bgCanvasFade: `light-dark(${light.bgCanvasFade}, ${dark.bgCanvasFade})`,

  bgSurface: `light-dark(${light.bgSurface}, ${dark.bgSurface})`,
  bgSurfaceRaised: `light-dark(${light.bgSurfaceRaised}, ${dark.bgSurfaceRaised})`,
  bgSurfaceSunken: `light-dark(${light.bgSurfaceSunken}, ${dark.bgSurfaceSunken})`,
  bgSurfaceBright: `light-dark(${light.bgSurfaceBright}, ${dark.bgSurfaceBright})`,
  bgSurfaceFade: `light-dark(${light.bgSurfaceFade}, ${dark.bgSurfaceFade})`,

  bgInteractiveRest: `light-dark(${light.bgInteractiveRest}, ${dark.bgInteractiveRest})`,
  bgInteractiveHover: `light-dark(${light.bgInteractiveHover}, ${dark.bgInteractiveHover})`,
  bgInteractivePressed: `light-dark(${light.bgInteractivePressed}, ${dark.bgInteractivePressed})`,
  bgInteractiveSelected: `light-dark(${light.bgInteractiveSelected}, ${dark.bgInteractiveSelected})`,
  bgInteractiveDisabled: `light-dark(${light.bgInteractiveDisabled}, ${dark.bgInteractiveDisabled})`,

  surfaceNeutralSubtle: `light-dark(${light.surfaceNeutralSubtle}, ${dark.surfaceNeutralSubtle})`,
  surfaceAccentSubtle: `light-dark(${light.surfaceAccentSubtle}, ${dark.surfaceAccentSubtle})`,
  surfaceAccentMuted: `light-dark(${light.surfaceAccentMuted}, ${dark.surfaceAccentMuted})`,
  surfaceInfoSubtle: `light-dark(${light.surfaceInfoSubtle}, ${dark.surfaceInfoSubtle})`,
  surfaceSuccessSubtle: `light-dark(${light.surfaceSuccessSubtle}, ${dark.surfaceSuccessSubtle})`,
  surfaceWarningSubtle: `light-dark(${light.surfaceWarningSubtle}, ${dark.surfaceWarningSubtle})`,
  surfaceDangerSubtle: `light-dark(${light.surfaceDangerSubtle}, ${dark.surfaceDangerSubtle})`,

  bgInverse: `light-dark(${light.bgInverse}, ${dark.bgInverse})`,

  bgOverlay: `light-dark(${light.bgOverlay}, ${dark.bgOverlay})`,
  bgScrim: `light-dark(${light.bgScrim}, ${dark.bgScrim})`,

  accent: `light-dark(${light.accent}, ${dark.accent})`,
  accentHover: `light-dark(${light.accentHover}, ${dark.accentHover})`,
  accentGlow: `light-dark(${light.accentGlow}, ${dark.accentGlow})`,

  neutral: `light-dark(${light.neutral}, ${dark.neutral})`,
  neutralHover: `light-dark(${light.neutralHover}, ${dark.neutralHover})`,
  neutralText: `light-dark(${light.neutralText}, ${dark.neutralText})`,
  neutralOn: `light-dark(${light.neutralOn}, ${dark.neutralOn})`,

  accentBorder: `light-dark(${light.accentBorder}, ${dark.accentBorder})`,
  infoBorder: `light-dark(${light.infoBorder}, ${dark.infoBorder})`,
  successBorder: `light-dark(${light.successBorder}, ${dark.successBorder})`,
  warningBorder: `light-dark(${light.warningBorder}, ${dark.warningBorder})`,
  dangerBorder: `light-dark(${light.dangerBorder}, ${dark.dangerBorder})`,
  neutralBorder: `light-dark(${light.neutralBorder}, ${dark.neutralBorder})`,

  info: `light-dark(${light.info}, ${dark.info})`,
  infoHover: `light-dark(${light.infoHover}, ${dark.infoHover})`,
  infoText: `light-dark(${light.infoText}, ${dark.infoText})`,
  infoOn: `light-dark(${light.infoOn}, ${dark.infoOn})`,
  success: `light-dark(${light.success}, ${dark.success})`,
  successHover: `light-dark(${light.successHover}, ${dark.successHover})`,
  successText: `light-dark(${light.successText}, ${dark.successText})`,
  successOn: `light-dark(${light.successOn}, ${dark.successOn})`,
  warning: `light-dark(${light.warning}, ${dark.warning})`,
  warningHover: `light-dark(${light.warningHover}, ${dark.warningHover})`,
  warningText: `light-dark(${light.warningText}, ${dark.warningText})`,
  warningOn: `light-dark(${light.warningOn}, ${dark.warningOn})`,
  danger: `light-dark(${light.danger}, ${dark.danger})`,
  dangerHover: `light-dark(${light.dangerHover}, ${dark.dangerHover})`,
  dangerText: `light-dark(${light.dangerText}, ${dark.dangerText})`,
  dangerOn: `light-dark(${light.dangerOn}, ${dark.dangerOn})`,

  brandTmdb: `light-dark(${light.brandTmdb}, ${dark.brandTmdb})`,
  brandCalculator: `light-dark(${light.brandCalculator}, ${dark.brandCalculator})`,
  brandCitadel: `light-dark(${light.brandCitadel}, ${dark.brandCitadel})`,
  brandWtcPlus: `light-dark(${light.brandWtcPlus}, ${dark.brandWtcPlus})`,
  brandWtcLetter: `light-dark(${light.brandWtcLetter}, ${dark.brandWtcLetter})`,
  brandBristol: `light-dark(${light.brandBristol}, ${dark.brandBristol})`,
  brandNottingham: `light-dark(${light.brandNottingham}, ${dark.brandNottingham})`,
  brandSpotify: `light-dark(${light.brandSpotify}, ${dark.brandSpotify})`,
  brandStudentLoan: `light-dark(${light.brandStudentLoan}, ${dark.brandStudentLoan})`,
  brandPixelCreatureCreator: `light-dark(${light.brandPixelCreatureCreator}, ${dark.brandPixelCreatureCreator})`,
});

export const font = stylex.defineVars({
  family: "Inter,Inter-fallback,sans-serif",
  familyMono:
    'ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace',

  // Static typography - UI elements
  uiDisplay: "3rem",
  uiSubDisplay: "2rem",
  uiHeading1: "1.5rem",
  uiHeading2: "1.25rem",
  uiHeading3: "1.1rem",
  uiBody: "1rem",
  uiBodySmall: ".85rem",
  uiCaption: ".75rem",
  uiOverline: ".7rem",

  // Responsive UI control label size. `rem`-based so it honours the user's
  // browser font size (WCAG 1.4.4), while resolving to the same computed px as
  // `controlSize._4` at the default 16px root (1.2rem→19.2px, 1rem→16px). It is
  // responsive like the `vp*` sizes, so the registry skips it.
  uiControl: {
    default: "1.2rem",
    [breakpoints.md]: "1rem",
  },

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
  _10: { default: "57.6px", [breakpoints.md]: "48px" },
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

// Shadow tint at each alpha step, resolved per scheme. Light shadows use
// `hsl(220 3% 15%)` over a 1% base strength; dark shadows `hsl(220 40% 2%)`
// over 25%. Each `_N` is base + N% — the offsets the layers below use.
const shadowTint = {
  _2: "light-dark(hsl(220 3% 15% / 3%), hsl(220 40% 2% / 27%))",
  _3: "light-dark(hsl(220 3% 15% / 4%), hsl(220 40% 2% / 28%))",
  _4: "light-dark(hsl(220 3% 15% / 5%), hsl(220 40% 2% / 29%))",
  _5: "light-dark(hsl(220 3% 15% / 6%), hsl(220 40% 2% / 30%))",
  _6: "light-dark(hsl(220 3% 15% / 7%), hsl(220 40% 2% / 31%))",
  _7: "light-dark(hsl(220 3% 15% / 8%), hsl(220 40% 2% / 32%))",
  _9: "light-dark(hsl(220 3% 15% / 10%), hsl(220 40% 2% / 34%))",
};

export const shadow = stylex.defineVars({
  _1: `0 1px 2px -1px ${shadowTint._9}`,
  _2: `0 3px 5px -2px ${shadowTint._3}, 0 7px 14px -5px ${shadowTint._5}`,
  _3: `0 -1px 3px 0 ${shadowTint._2}, 0 1px 2px -5px ${shadowTint._2}, 0 2px 5px -5px ${shadowTint._4}, 0 4px 12px -5px ${shadowTint._5}, 0 12px 15px -5px ${shadowTint._7}`,
  _4: `0 -2px 5px 0 ${shadowTint._2}, 0 1px 1px -2px ${shadowTint._3}, 0 2px 2px -2px ${shadowTint._3}, 0 5px 5px -2px ${shadowTint._4}, 0 9px 9px -2px ${shadowTint._5}, 0 16px 16px -2px ${shadowTint._6}`,
  _5: `0 -1px 2px 0 ${shadowTint._2}, 0 2px 1px -2px ${shadowTint._3}, 0 5px 5px -2px ${shadowTint._3}, 0 10px 10px -2px ${shadowTint._4}, 0 20px 20px -2px ${shadowTint._5}, 0 40px 40px -2px ${shadowTint._7}`,
  _6: `0 -1px 2px 0 ${shadowTint._2}, 0 3px 2px -2px ${shadowTint._3}, 0 7px 5px -2px ${shadowTint._3}, 0 12px 10px -2px ${shadowTint._4}, 0 22px 18px -2px ${shadowTint._5}, 0 41px 33px -2px ${shadowTint._6}, 0 100px 80px -2px ${shadowTint._7}`,

  // Inset shadow for sunken/inset surfaces
  inset: `inset 0 1px 2px ${shadowTint._6}`,
});
