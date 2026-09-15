import * as stylex from "@stylexjs/stylex";
import { blue, blue_rgb } from "./_generated/palette/hues/blue.stylex.ts";
import { gray, gray_rgb } from "./_generated/palette/hues/gray.stylex.ts";
import { green, green_rgb } from "./_generated/palette/hues/green.stylex.ts";
import { orange, orange_rgb } from "./_generated/palette/hues/orange.stylex.ts";
import { purple, purple_rgb } from "./_generated/palette/hues/purple.stylex.ts";
import { red, red_rgb } from "./_generated/palette/hues/red.stylex.ts";
import { breakpoints } from "./breakpoints.stylex.ts";

// Colour tokens are named `<property><subject>[<qualifier>][<state>]`:
//
// • property — `fg`, `bg` or `border`. `fg` is anything drawn on a surface:
//   text, icons, logos.
// • subject — a Token Role (`canvas`, `surface`, `control`, or an Intent:
//   `accent`, `info`, `success`, `warning`, `danger`, `neutral`) or a Material
//   (`MaterialGlass`). `inverse` and `scrim` are treatments a surface takes,
//   not Token Roles. `fgOn<X>` is the foreground for `bg<X>`.
// • qualifier — `subtle` is an Intent's tint; `sunken`, `raised` and `fade`
//   are a surface's elevation.
// • state — `hover`, `pressed`, `selected`, `disabled`. Bare is rest.
//
// The bare form is the default: `fg` is body text, `border` the quiet edge,
// `bgControl` a control at rest, `bgAccent` the solid fill. The foreground on
// a solid Intent fill is `fgOn<Intent>`; on its tint it is `fg<Intent>`.
// Neutral is the default Intent, so its foreground and border are `fg` and
// `border`.
//
// The group holds every colour token of the design system.
//
// Translucent tokens compose `rgba()` strings from the `<hue>_rgb` group
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
// values themselves, edit `packages/system-palette-codegen/src/system-hues.ts` and run
// `pnpm codegen:palette`.

// Each Intent's fill and its border share one tone per theme, so a retune
// cannot split them.
const lightIntentTone = {
  accent: purple._40,
  info: blue._40,
  success: green._40,
  warning: orange._40,
  danger: red._40,
};

const darkIntentTone = {
  accent: purple._70,
  info: blue._70,
  success: green._70,
  warning: orange._70,
  danger: red._70,
};

const light = {
  // Foreground — two levels, measured with APCA against every surface they
  // can land on (`tokens.contrast.test.ts`). `fg` clears the Lc 75 body floor,
  // `fgMuted` the Lc 60 non-body floor. Worst case in light is
  // `bgControlSelected` (gray._90): fg 86, muted 65.
  //
  // In dark the worst case is `bgControlHover` (gray._13): fg 90, muted 70.
  // The ramp has no tone between _70 and _80, and gray._70 measures only 54
  // there, so the dark `fgMuted` is one tone louder than the light one.
  fg: gray._13,
  fgMuted: gray._30,
  fgOnControlBright: gray._20,
  fgOnInverse: gray._92,
  // The scrim is the same black in both themes, so its foreground is the same
  // white.
  fgOnScrim: gray._100,

  // Canvas — the app shell behind everything. `Fade` is the colour translucent
  // gradients blend toward (consumed via color-mix()).
  bgCanvas: gray._97,
  bgCanvasFade: gray._92,

  // Surface — cards, panels, dialog bodies. Raised is also the floating
  // surface of a menu or a popover, which sits on `layer.raised`.
  bgSurface: gray._100,
  bgSurfaceSunken: gray._98,
  bgSurfaceRaised: gray._100,
  bgSurfaceFade: gray._95,

  // A bright control stays light in both themes (a switch or slider thumb).
  // Inverse flips the theme (tooltips, snackbars). Scrim dims the page behind
  // a modal.
  bgControlBright: gray._100,
  bgInverse: gray._20,
  bgScrim: "rgba(0, 0, 0, 0.7)",

  // Control — buttons, list rows, menu items. `Disabled` is the one tone that
  // never lands at full strength: it is painted on the same element as
  // `opacity.disabled`, so what you see is always this tone composited with
  // whatever sits behind the control.
  bgControl: gray._100,
  bgControlHover: gray._97,
  bgControlPressed: gray._92,
  bgControlSelected: gray._90,
  bgControlDisabled: gray._95,

  // The quiet default edge, and the neutral Intent's border.
  border: gray._90,

  // Intents — a solid fill and its hover, a tint (alpha is fixed, colour comes
  // from the palette), a solid border for rings and selected edges, a
  // foreground on its own, and a foreground on the solid fill.
  bgAccent: lightIntentTone.accent,
  bgAccentHover: purple._50,
  bgAccentSubtle: `rgba(${purple_rgb._30}, 0.08)`,
  borderAccent: lightIntentTone.accent,
  fgAccent: purple._20,
  fgOnAccent: gray._100,

  bgInfo: lightIntentTone.info,
  bgInfoHover: blue._50,
  bgInfoSubtle: `rgba(${blue_rgb._50}, 0.1)`,
  borderInfo: lightIntentTone.info,
  fgInfo: blue._20,
  fgOnInfo: gray._100,

  bgSuccess: lightIntentTone.success,
  bgSuccessHover: green._50,
  bgSuccessSubtle: `rgba(${green_rgb._50}, 0.1)`,
  borderSuccess: lightIntentTone.success,
  fgSuccess: green._20,
  fgOnSuccess: gray._100,

  bgWarning: lightIntentTone.warning,
  bgWarningHover: orange._50,
  bgWarningSubtle: `rgba(${orange_rgb._50}, 0.12)`,
  borderWarning: lightIntentTone.warning,
  fgWarning: orange._20,
  fgOnWarning: gray._100,

  bgDanger: lightIntentTone.danger,
  bgDangerHover: red._50,
  bgDangerSubtle: `rgba(${red_rgb._50}, 0.1)`,
  borderDanger: lightIntentTone.danger,
  fgDanger: red._30,
  fgOnDanger: gray._100,

  // Mid-tone neutrals for chrome, tracks and chips. Neutral's foreground and
  // border are `fg` and `border`.
  bgNeutral: gray._80,
  bgNeutralHover: gray._90,
  bgNeutralSubtle: `rgba(${gray_rgb._30}, 0.12)`,
  fgOnNeutral: gray._0,

  // Glass — the translucent fill over the blur, the hairline rim all the way
  // round, and the light on that rim. Against a light page the rim reads as a
  // dark edge; against a dark one it is clear, and only the light on it shows.
  bgMaterialGlass: `rgba(${gray_rgb._100}, 0.8)`,
  borderMaterialGlass: `rgba(${gray_rgb._0}, 0.3)`,
  borderMaterialGlassHighlight: `rgba(${gray_rgb._100}, 0.6)`,
};

const dark: { [key in keyof typeof light]: string } = {
  fg: gray._92,
  fgMuted: gray._80,
  fgOnControlBright: gray._0,
  fgOnInverse: gray._20,
  fgOnScrim: gray._100,

  bgCanvas: gray._0,
  bgCanvasFade: gray._0,

  bgSurface: gray._5,
  bgSurfaceSunken: gray._2,
  bgSurfaceRaised: gray._7,
  bgSurfaceFade: gray._5,

  bgControlBright: gray._80,
  bgInverse: gray._92,
  bgScrim: "rgba(0, 0, 0, 0.7)",

  bgControl: gray._7,
  bgControlHover: gray._13,
  bgControlPressed: gray._11,
  bgControlSelected: gray._9,
  bgControlDisabled: gray._5,

  border: gray._13,

  bgAccent: darkIntentTone.accent,
  bgAccentHover: purple._80,
  bgAccentSubtle: `rgba(${purple_rgb._100}, 0.12)`,
  borderAccent: darkIntentTone.accent,
  fgAccent: purple._95,
  fgOnAccent: gray._0,

  bgInfo: darkIntentTone.info,
  bgInfoHover: blue._80,
  bgInfoSubtle: `rgba(${blue_rgb._100}, 0.14)`,
  borderInfo: darkIntentTone.info,
  fgInfo: blue._95,
  fgOnInfo: gray._0,

  bgSuccess: darkIntentTone.success,
  bgSuccessHover: green._80,
  bgSuccessSubtle: `rgba(${green_rgb._100}, 0.14)`,
  borderSuccess: darkIntentTone.success,
  fgSuccess: green._90,
  fgOnSuccess: gray._0,

  bgWarning: darkIntentTone.warning,
  bgWarningHover: orange._80,
  bgWarningSubtle: `rgba(${orange_rgb._100}, 0.16)`,
  borderWarning: darkIntentTone.warning,
  fgWarning: orange._90,
  fgOnWarning: gray._0,

  bgDanger: darkIntentTone.danger,
  bgDangerHover: red._80,
  bgDangerSubtle: `rgba(${red_rgb._100}, 0.14)`,
  borderDanger: darkIntentTone.danger,
  fgDanger: red._80,
  fgOnDanger: gray._0,

  bgNeutral: gray._20,
  bgNeutralHover: gray._30,
  bgNeutralSubtle: `rgba(${gray_rgb._70}, 0.14)`,
  fgOnNeutral: gray._100,

  bgMaterialGlass: `rgba(${gray_rgb._100}, 0.12)`,
  borderMaterialGlass: "transparent",
  borderMaterialGlassHighlight: `rgba(${gray_rgb._100}, 0.25)`,
};

const NO_CORNER_SHAPE = "@supports not (corner-shape: squircle)";

export const constants = stylex.defineConsts({
  DARK: "@media (prefers-color-scheme: dark)",
  NO_CORNER_SHAPE,
});

export const layout = stylex.defineConsts({
  maxInlineSize: "1140px",
});

export const color = stylex.defineVars({
  fg: `light-dark(${light.fg}, ${dark.fg})`,
  fgMuted: `light-dark(${light.fgMuted}, ${dark.fgMuted})`,
  fgOnControlBright: `light-dark(${light.fgOnControlBright}, ${dark.fgOnControlBright})`,
  fgOnInverse: `light-dark(${light.fgOnInverse}, ${dark.fgOnInverse})`,
  fgOnScrim: `light-dark(${light.fgOnScrim}, ${dark.fgOnScrim})`,

  bgCanvas: `light-dark(${light.bgCanvas}, ${dark.bgCanvas})`,
  bgCanvasFade: `light-dark(${light.bgCanvasFade}, ${dark.bgCanvasFade})`,

  bgSurface: `light-dark(${light.bgSurface}, ${dark.bgSurface})`,
  bgSurfaceSunken: `light-dark(${light.bgSurfaceSunken}, ${dark.bgSurfaceSunken})`,
  bgSurfaceRaised: `light-dark(${light.bgSurfaceRaised}, ${dark.bgSurfaceRaised})`,
  bgSurfaceFade: `light-dark(${light.bgSurfaceFade}, ${dark.bgSurfaceFade})`,

  bgControlBright: `light-dark(${light.bgControlBright}, ${dark.bgControlBright})`,
  bgInverse: `light-dark(${light.bgInverse}, ${dark.bgInverse})`,
  bgScrim: `light-dark(${light.bgScrim}, ${dark.bgScrim})`,

  bgControl: `light-dark(${light.bgControl}, ${dark.bgControl})`,
  bgControlHover: `light-dark(${light.bgControlHover}, ${dark.bgControlHover})`,
  bgControlPressed: `light-dark(${light.bgControlPressed}, ${dark.bgControlPressed})`,
  bgControlSelected: `light-dark(${light.bgControlSelected}, ${dark.bgControlSelected})`,
  bgControlDisabled: `light-dark(${light.bgControlDisabled}, ${dark.bgControlDisabled})`,

  border: `light-dark(${light.border}, ${dark.border})`,

  bgAccent: `light-dark(${light.bgAccent}, ${dark.bgAccent})`,
  bgAccentHover: `light-dark(${light.bgAccentHover}, ${dark.bgAccentHover})`,
  bgAccentSubtle: `light-dark(${light.bgAccentSubtle}, ${dark.bgAccentSubtle})`,
  borderAccent: `light-dark(${light.borderAccent}, ${dark.borderAccent})`,
  fgAccent: `light-dark(${light.fgAccent}, ${dark.fgAccent})`,
  fgOnAccent: `light-dark(${light.fgOnAccent}, ${dark.fgOnAccent})`,

  bgInfo: `light-dark(${light.bgInfo}, ${dark.bgInfo})`,
  bgInfoHover: `light-dark(${light.bgInfoHover}, ${dark.bgInfoHover})`,
  bgInfoSubtle: `light-dark(${light.bgInfoSubtle}, ${dark.bgInfoSubtle})`,
  borderInfo: `light-dark(${light.borderInfo}, ${dark.borderInfo})`,
  fgInfo: `light-dark(${light.fgInfo}, ${dark.fgInfo})`,
  fgOnInfo: `light-dark(${light.fgOnInfo}, ${dark.fgOnInfo})`,

  bgSuccess: `light-dark(${light.bgSuccess}, ${dark.bgSuccess})`,
  bgSuccessHover: `light-dark(${light.bgSuccessHover}, ${dark.bgSuccessHover})`,
  bgSuccessSubtle: `light-dark(${light.bgSuccessSubtle}, ${dark.bgSuccessSubtle})`,
  borderSuccess: `light-dark(${light.borderSuccess}, ${dark.borderSuccess})`,
  fgSuccess: `light-dark(${light.fgSuccess}, ${dark.fgSuccess})`,
  fgOnSuccess: `light-dark(${light.fgOnSuccess}, ${dark.fgOnSuccess})`,

  bgWarning: `light-dark(${light.bgWarning}, ${dark.bgWarning})`,
  bgWarningHover: `light-dark(${light.bgWarningHover}, ${dark.bgWarningHover})`,
  bgWarningSubtle: `light-dark(${light.bgWarningSubtle}, ${dark.bgWarningSubtle})`,
  borderWarning: `light-dark(${light.borderWarning}, ${dark.borderWarning})`,
  fgWarning: `light-dark(${light.fgWarning}, ${dark.fgWarning})`,
  fgOnWarning: `light-dark(${light.fgOnWarning}, ${dark.fgOnWarning})`,

  bgDanger: `light-dark(${light.bgDanger}, ${dark.bgDanger})`,
  bgDangerHover: `light-dark(${light.bgDangerHover}, ${dark.bgDangerHover})`,
  bgDangerSubtle: `light-dark(${light.bgDangerSubtle}, ${dark.bgDangerSubtle})`,
  borderDanger: `light-dark(${light.borderDanger}, ${dark.borderDanger})`,
  fgDanger: `light-dark(${light.fgDanger}, ${dark.fgDanger})`,
  fgOnDanger: `light-dark(${light.fgOnDanger}, ${dark.fgOnDanger})`,

  bgNeutral: `light-dark(${light.bgNeutral}, ${dark.bgNeutral})`,
  bgNeutralHover: `light-dark(${light.bgNeutralHover}, ${dark.bgNeutralHover})`,
  bgNeutralSubtle: `light-dark(${light.bgNeutralSubtle}, ${dark.bgNeutralSubtle})`,
  fgOnNeutral: `light-dark(${light.fgOnNeutral}, ${dark.fgOnNeutral})`,

  bgMaterialGlass: `light-dark(${light.bgMaterialGlass}, ${dark.bgMaterialGlass})`,
  borderMaterialGlass: `light-dark(${light.borderMaterialGlass}, ${dark.borderMaterialGlass})`,
  borderMaterialGlassHighlight: `light-dark(${light.borderMaterialGlassHighlight}, ${dark.borderMaterialGlassHighlight})`,
});

export const font = stylex.defineVars({
  family: "Inter,Inter-fallback,sans-serif",
  familyMono:
    '"IBM Plex Mono","IBM Plex Mono-fallback",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',

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

  // The caption step of the same scale, for muted labels inside control chrome
  // (menu section titles and the like). Same bargain as `uiControl`: `rem`-based
  // so it honours the user's browser font size, while resolving to the same
  // computed px as `controlSize._3` at the default 16px root
  // (0.9rem→14.4px, 0.75rem→12px). Also skipped by the registry.
  uiControlCaption: {
    default: "0.9rem",
    [breakpoints.md]: "0.75rem",
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

  // A browser without `corner-shape` draws a circular arc, which cuts about
  // three times the corner area of a squircle. The .6 factor makes them equal.
  radius_1: { default: ".3rem", [NO_CORNER_SHAPE]: "calc(.3rem * .6)" },
  radius_2: { default: ".5rem", [NO_CORNER_SHAPE]: "calc(.5rem * .6)" },
  radius_3: { default: "1rem", [NO_CORNER_SHAPE]: "calc(1rem * .6)" },
  radius_4: { default: "2rem", [NO_CORNER_SHAPE]: "calc(2rem * .6)" },
  radius_5: { default: "3rem", [NO_CORNER_SHAPE]: "calc(3rem * .6)" },

  radius_round: "1e5px",
});

// Named planes for stacking order, listed bottom to top — the numbers are
// spaced by 100 so a plane can take local steps without colliding with the next
// one, and `blur` alone sits halfway between two rungs. The order encodes the
// invariants, so read it as a ladder:
//
// - `blur` is the Blur plane — the page's progressive blurs, above everything
//   the page scrolls and under every control that floats. Sticky chrome at
//   `raised` and the header at `header` keep their controls crisp over it, a
//   card lifted to `content` on hover stays under it, and a popover anchored to
//   a control sits over it with its own blur beside it.
// - `raised` lifts an in-page surface above scrolling `content` without leaving
//   the page: a menu popped from a control, a sticky filter bar, a card that
//   rises on hover. It stays under the chrome, so it scrolls away beneath it.
// - `header` is that chrome — a fixed header, a sticky nav rail, a mobile bar.
// - `overlay` covers the chrome too: a modal, drawer, or sheet owns the viewport
//   while it is open, so its close affordance can never end up behind a header
//   or a rail. Reach for it only when the surface really does own the viewport;
//   a popover anchored to a control belongs on `raised`.
// - `tooltip` covers an open overlay, because a tooltip can describe a control
//   inside one; `toaster` covers everything, because a toast may be the only
//   report that an action succeeded.
//
// A plane only applies where it can be seen: `position: fixed`, `sticky`, and
// `isolation: isolate` all open a stacking context, and a child's `z-index`
// never escapes one. Put the plane on the outermost element of the surface.
export const layer = stylex.defineVars({
  background: stylex.types.integer(-100),
  base: stylex.types.integer(0),
  content: stylex.types.integer(100),
  blur: stylex.types.integer(150),
  raised: stylex.types.integer(200),
  header: stylex.types.integer(300),
  overlay: stylex.types.integer(400),
  tooltip: stylex.types.integer(500),
  toaster: stylex.types.integer(600),
});

// The fade that marks a control inactive. One value for every control, because
// the fade is the whole disabled treatment — fill, label, border and icon dim
// together against whatever is behind, which is what keeps it right on any
// surface in either theme without a disabled color per variant. 0.6 lands
// disabled text just under the AA floor the text ladder is held to (~4.0:1 for
// a field's value and an accent button's label in light mode): legible, but
// never as loud as something active.
export const opacity = stylex.defineVars({
  disabled: stylex.types.number(0.6),
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
