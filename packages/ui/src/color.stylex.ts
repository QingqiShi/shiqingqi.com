import * as stylex from "@stylexjs/stylex";
import { blue, blue_rgb } from "./_generated/palette/hues/blue.stylex.ts";
import { gray, gray_rgb } from "./_generated/palette/hues/gray.stylex.ts";
import { green, green_rgb } from "./_generated/palette/hues/green.stylex.ts";
import { orange, orange_rgb } from "./_generated/palette/hues/orange.stylex.ts";
import { red, red_rgb } from "./_generated/palette/hues/red.stylex.ts";

// A colour token is named for the thing it paints, not for the CSS property
// and not for a level. The names are those of shadcn/ui, so the question is
// the same: "what is this element?"
//
// • A fill and the content on it are a pair: `card` and `cardForeground`,
//   `primary` and `primaryForeground`. The CSS property says which is which:
//   `backgroundColor: color.card`, `color: color.cardForeground`.
//
// • A surface holds content. Choose it by what the element is: `background`
//   is the page, `card` is a container on the page (also an island of an app
//   shell), `popover` is what floats above the page. In light the three have
//   the same fill, and an edge or a shadow sets them apart.
//
// • A neutral fill on a surface is opaque, and the three have the same
//   value: `muted` is a quiet region, `accent` is the fill of an item under
//   the pointer, pressed or selected, `secondary` is a neutral piece such as
//   a secondary button, a neutral badge or a track. The three names let a
//   theme give them different values.
//
// • A colour with a meaning is solid: `primary`, `destructive`, `success`,
//   `warning`, `info`. `<name>Subtle` is its tint, and `<name>Text` is its
//   colour as text or as an icon, on a surface or on the tint. The solid tone
//   is also the edge of that meaning. A component prop takes the same name:
//   `intent="destructive"` paints `destructive`.
//
// • A line is `border` (the quiet edge and the divider), `input` (the edge of
//   a text field, and a neutral mark such as a track or a grabber),
//   `borderStrong` (an edge that is the only sign of a control) or `ring`
//   (the focus ring).
//
// • A state has no token. Under the pointer, pressed or selected, an element
//   takes `accent`. A solid fill shows some of what is below it:
//   `color-mix(in srgb, ${color.primary} 90%, transparent)`.
//
// Theming: each var in the `color` group below is a single constant
// `light-dark(<light>, <dark>)` value that resolves against the element's
// `color-scheme`. The root defaults to `color-scheme: light dark` (follow the
// OS), and forcing a theme just pins `color-scheme: light` or `dark` — see
// `getDocumentClassName` in apps/web. No per-theme stylesheets are generated.
//
// Translucent tokens compose `rgba()` strings from the `<hue>_rgb` group
// (comma-separated channels per tone). CSS does lexical substitution, so
// `rgba(var(--gray_rgb_97), 0.05)` evaluates to `rgba(251,249,246, 0.05)` at
// paint time.
//
// To change a token's palette mapping, edit the entry below. To change palette
// values themselves, edit `packages/system-palette-codegen/src/system-hues.ts` and run
// `pnpm codegen:palette`.

const light = {
  // The page, and the text on it. `foreground` clears the Lc 75 body floor
  // (APCA) and `mutedForeground` the Lc 60 non-body floor on each surface and
  // on the neutral fill. contrast/color-ladder.test.ts keeps these floors.
  background: gray._100,
  foreground: gray._5,

  card: gray._100,
  cardForeground: gray._5,
  popover: gray._100,
  popoverForeground: gray._5,

  muted: gray._95,
  mutedForeground: gray._30,
  accent: gray._95,
  accentForeground: gray._5,
  secondary: gray._95,
  secondaryForeground: gray._5,

  // Lines. `borderStrong` is not quiet: WCAG 1.4.11 sets a 3:1 floor on an
  // edge that is the only sign of a control, such as an empty checkbox,
  // against each surface.
  border: gray._87,
  borderStrong: gray._40,
  input: gray._87,
  ring: gray._13,

  // Meanings: the solid fill and the content on it, the tint (the alpha is
  // fixed, the colour comes from the palette), and the colour as text.
  primary: gray._13,
  primaryForeground: gray._100,
  primarySubtle: `rgba(${gray_rgb._13}, 0.06)`,
  primaryText: gray._13,

  destructive: red._40,
  destructiveForeground: gray._100,
  destructiveSubtle: `rgba(${red_rgb._50}, 0.1)`,
  destructiveText: red._30,

  success: green._40,
  successForeground: gray._100,
  successSubtle: `rgba(${green_rgb._50}, 0.1)`,
  successText: green._20,

  warning: orange._40,
  warningForeground: gray._100,
  warningSubtle: `rgba(${orange_rgb._50}, 0.12)`,
  warningText: orange._20,

  info: blue._40,
  infoForeground: gray._100,
  infoSubtle: `rgba(${blue_rgb._50}, 0.1)`,
  infoText: blue._20,

  // The scrim that dims the page behind a modal. It is the same black in both
  // themes, so the content on it is the same white.
  overlay: "rgba(0, 0, 0, 0.7)",
  overlayForeground: gray._100,

  // Glass — the translucent fill over the blur, the hairline rim all the way
  // round, and the light on that rim. Against a light page the rim reads as a
  // dark edge; against a dark one it is clear, and only the light on it shows.
  glass: `rgba(${gray_rgb._100}, 0.8)`,
  glassBorder: `rgba(${gray_rgb._0}, 0.3)`,
  glassHighlight: `rgba(${gray_rgb._100}, 0.6)`,
};

const dark: { [key in keyof typeof light]: string } = {
  background: gray._0,
  // gray._70 and gray._80 are too near `foreground` in dark: done and
  // secondary text did not recede as they do in light.
  foreground: gray._97,

  // In dark, a surface nearer to the reader is lighter.
  card: gray._5,
  cardForeground: gray._97,
  popover: gray._7,
  popoverForeground: gray._97,

  muted: gray._11,
  mutedForeground: gray._60,
  accent: gray._11,
  accentForeground: gray._97,
  secondary: gray._11,
  secondaryForeground: gray._97,

  border: `rgba(${gray_rgb._97}, 0.1)`,
  borderStrong: gray._35,
  input: `rgba(${gray_rgb._97}, 0.15)`,
  ring: gray._92,

  primary: gray._92,
  primaryForeground: gray._0,
  primarySubtle: `rgba(${gray_rgb._92}, 0.1)`,
  primaryText: gray._92,

  // Destructive does not use _70 like the other meanings. The owner is
  // colour-blind, and red._70 looks pink-grey to them, not red.
  // The label on red._50 is white, not black: APCA gives Lc 58 for white and
  // Lc 51 for black. No tone of the ramp lets either clear Lc 60.
  destructive: red._50,
  destructiveForeground: gray._100,
  destructiveSubtle: `rgba(${red_rgb._50}, 0.14)`,
  // red._60 is under the Lc 60 floor on a fill, so the text is red._70.
  destructiveText: red._70,

  success: green._70,
  successForeground: gray._0,
  successSubtle: `rgba(${green_rgb._50}, 0.14)`,
  successText: green._80,

  warning: orange._70,
  warningForeground: gray._0,
  warningSubtle: `rgba(${orange_rgb._50}, 0.16)`,
  warningText: orange._80,

  info: blue._70,
  infoForeground: gray._0,
  infoSubtle: `rgba(${blue_rgb._50}, 0.14)`,
  infoText: blue._80,

  overlay: "rgba(0, 0, 0, 0.7)",
  overlayForeground: gray._100,

  glass: `rgba(${gray_rgb._100}, 0.12)`,
  glassBorder: "transparent",
  glassHighlight: `rgba(${gray_rgb._100}, 0.25)`,
};

/**
 * The light and the dark value of each `color` token, for code that runs
 * outside CSS. A style uses `color`.
 *
 * @internal
 */
export function colorThemes() {
  return { light, dark };
}

export const color = stylex.defineVars({
  background: `light-dark(${light.background}, ${dark.background})`,
  foreground: `light-dark(${light.foreground}, ${dark.foreground})`,

  card: `light-dark(${light.card}, ${dark.card})`,
  cardForeground: `light-dark(${light.cardForeground}, ${dark.cardForeground})`,
  popover: `light-dark(${light.popover}, ${dark.popover})`,
  popoverForeground: `light-dark(${light.popoverForeground}, ${dark.popoverForeground})`,

  muted: `light-dark(${light.muted}, ${dark.muted})`,
  mutedForeground: `light-dark(${light.mutedForeground}, ${dark.mutedForeground})`,
  accent: `light-dark(${light.accent}, ${dark.accent})`,
  accentForeground: `light-dark(${light.accentForeground}, ${dark.accentForeground})`,
  secondary: `light-dark(${light.secondary}, ${dark.secondary})`,
  secondaryForeground: `light-dark(${light.secondaryForeground}, ${dark.secondaryForeground})`,

  border: `light-dark(${light.border}, ${dark.border})`,
  borderStrong: `light-dark(${light.borderStrong}, ${dark.borderStrong})`,
  input: `light-dark(${light.input}, ${dark.input})`,
  ring: `light-dark(${light.ring}, ${dark.ring})`,

  primary: `light-dark(${light.primary}, ${dark.primary})`,
  primaryForeground: `light-dark(${light.primaryForeground}, ${dark.primaryForeground})`,
  primarySubtle: `light-dark(${light.primarySubtle}, ${dark.primarySubtle})`,
  primaryText: `light-dark(${light.primaryText}, ${dark.primaryText})`,

  destructive: `light-dark(${light.destructive}, ${dark.destructive})`,
  destructiveForeground: `light-dark(${light.destructiveForeground}, ${dark.destructiveForeground})`,
  destructiveSubtle: `light-dark(${light.destructiveSubtle}, ${dark.destructiveSubtle})`,
  destructiveText: `light-dark(${light.destructiveText}, ${dark.destructiveText})`,

  success: `light-dark(${light.success}, ${dark.success})`,
  successForeground: `light-dark(${light.successForeground}, ${dark.successForeground})`,
  successSubtle: `light-dark(${light.successSubtle}, ${dark.successSubtle})`,
  successText: `light-dark(${light.successText}, ${dark.successText})`,

  warning: `light-dark(${light.warning}, ${dark.warning})`,
  warningForeground: `light-dark(${light.warningForeground}, ${dark.warningForeground})`,
  warningSubtle: `light-dark(${light.warningSubtle}, ${dark.warningSubtle})`,
  warningText: `light-dark(${light.warningText}, ${dark.warningText})`,

  info: `light-dark(${light.info}, ${dark.info})`,
  infoForeground: `light-dark(${light.infoForeground}, ${dark.infoForeground})`,
  infoSubtle: `light-dark(${light.infoSubtle}, ${dark.infoSubtle})`,
  infoText: `light-dark(${light.infoText}, ${dark.infoText})`,

  overlay: `light-dark(${light.overlay}, ${dark.overlay})`,
  overlayForeground: `light-dark(${light.overlayForeground}, ${dark.overlayForeground})`,

  glass: `light-dark(${light.glass}, ${dark.glass})`,
  glassBorder: `light-dark(${light.glassBorder}, ${dark.glassBorder})`,
  glassHighlight: `light-dark(${light.glassHighlight}, ${dark.glassHighlight})`,
});
