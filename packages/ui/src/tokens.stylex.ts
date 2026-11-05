import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "./breakpoints.stylex.ts";

const NO_CORNER_SHAPE = "@supports not (corner-shape: squircle)";

export const constants = stylex.defineConsts({
  DARK: "@media (prefers-color-scheme: dark)",
  NO_CORNER_SHAPE,
});

export const layout = stylex.defineConsts({
  maxInlineSize: "1140px",
});

/**
 * The Measure: the width cap for a block of prose, in `em` so the cap tracks
 * its text's size. `Text` already takes `prose` when it renders a paragraph.
 */
export const measure = stylex.defineConsts({
  /** Running prose. 41 Chinese characters at any size, around 88 Latin. */
  prose: "41em",
  /**
   * A short standalone block: a lede, an empty state, a hint. 24 Chinese
   * characters, around 50 Latin, so it reads as one compact unit.
   */
  short: "24em",
  /** A column of form fields, so that their edges line up. */
  form: "32em",
});

/**
 * The type values set for Haffer, the Latin face. Chinese text does not use
 * Haffer, so `root.html` sets them back to plain values on a Chinese page.
 *
 * - `trackingBody`, `trackingHeading`, `trackingDisplay` — the tracking of
 *   the text roles, the heading roles and the display roles.
 * - `lineHeightHeading`, `lineHeightDisplay` — the leading of the heading
 *   roles and the display roles. Han characters fill the em box, so Chinese
 *   text takes a taller display leading.
 */
export const latinType = stylex.defineVars({
  trackingBody: "0.02em",
  trackingHeading: "-0.015em",
  trackingDisplay: "-0.02em",
  lineHeightHeading: stylex.types.number(1.24),
  lineHeightDisplay: stylex.types.number(0.98),
});

export const font = stylex.defineVars({
  family: "Haffer,Haffer-fallback,sans-serif",
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
  uiOverline: ".85rem",

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
  // The leading of running text. Chinese text takes a taller one.
  lineHeightBody: stylex.types.number(1.5),

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

/**
 * The space between two things, named by how they relate. Each step is about
 * twice the one below. Use `rhythm` for a gap or a margin between siblings, and
 * `space` for geometry that is not a relationship, such as padding and offsets.
 *
 * - `inline` — the parts of one unit on one line, such as an icon and its
 *   label, or a value and its unit.
 * - `tight` — the boxes inside one item, such as a field and its chips.
 * - `item` — siblings in a group.
 * - `group` — between groups, such as h3 sub-sections.
 * - `section` — between h2 sections. It grows at `md`.
 *
 * Lines of text in one item, such as an item's title and its detail, take no
 * gap (`stack.text`). A line box already holds space above and below its
 * letters, so a gap of `tight` between two lines looks as wide as `item`.
 * Two paragraphs are two items, so they take `item`. A heading at h2 size or
 * larger is the exception: its line height is so small that its letters fill
 * its line box, so it takes `tight` to its text, and display type takes
 * `item`. The `@tuja/require-text-stack` lint rule checks both.
 *
 * Rows that pad themselves, such as nav links, take no gap either
 * (`stack.rows`): their padding is the space between them, and a gap would
 * double it. The same holds for such controls side by side, such as ghost
 * buttons in a row. Measure a gap between what a reader sees, not between
 * boxes.
 */
export const rhythm = stylex.defineVars({
  inline: ".25rem",
  tight: ".5rem",
  item: "1rem",
  group: "2rem",
  section: { default: "3rem", [breakpoints.md]: "4rem" },
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

/**
 * The height of a control at each `size` step. A step names the same height
 * in every control, so a `sm` Button, Select and TextField line up in a row.
 */
export const controlHeight = stylex.defineVars({
  xs: controlSize._6,
  sm: controlSize._8,
  md: controlSize._9,
  lg: controlSize._10,
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
// one, and `effect` and `blur` sit between two rungs. The order encodes the
// invariants, so read it as a ladder:
//
// - `effect` is the effect layer's scroll `<canvas>` elements. They draw over
//   everything the page scrolls, a card lifted to `content` too, so an effect
//   can show on an opaque surface. They stay under the Blur plane, sticky
//   chrome at `raised`, the header and every overlay, so the page's chrome
//   stays clear of effects. They never take a pointer, focus or a hit test.
//   Chrome must not be inside a stacking context that sits below `effect`,
//   because there its plane cannot lift it over the effects. For this reason
//   a shell that holds chrome does not isolate itself.
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
// - `fixedEffect` is the effect layer's fixed `<canvas>`, over all other
//   planes. It draws the effects of the elements that do not scroll with the
//   page — the header, a stuck sticky bar, a fixed tab bar, an open sheet — so
//   each effect shows over the surface it belongs to.
//
// A plane only applies where it can be seen: `position: fixed`, `sticky`, and
// `isolation: isolate` all open a stacking context, and a child's `z-index`
// never escapes one. Put the plane on the outermost element of the surface.
export const layer = stylex.defineVars({
  background: stylex.types.integer(-100),
  base: stylex.types.integer(0),
  content: stylex.types.integer(100),
  effect: stylex.types.integer(125),
  blur: stylex.types.integer(150),
  raised: stylex.types.integer(200),
  header: stylex.types.integer(300),
  overlay: stylex.types.integer(400),
  tooltip: stylex.types.integer(500),
  toaster: stylex.types.integer(600),
  fixedEffect: stylex.types.integer(700),
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
