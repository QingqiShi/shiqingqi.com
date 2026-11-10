import * as stylex from "@stylexjs/stylex";
import { blue, blue_rgb } from "./_generated/palette/hues/blue.stylex.ts";
import { gray, gray_rgb } from "./_generated/palette/hues/gray.stylex.ts";
import { green, green_rgb } from "./_generated/palette/hues/green.stylex.ts";
import { orange, orange_rgb } from "./_generated/palette/hues/orange.stylex.ts";
import { purple, purple_rgb } from "./_generated/palette/hues/purple.stylex.ts";
import { red, red_rgb } from "./_generated/palette/hues/red.stylex.ts";

// Colour tokens are named `<property><subject>[<qualifier>][<state>]`:
//
// • property — `fg`, `bg` or `border`. `fg` is anything drawn on a surface:
//   text, icons, logos.
// • subject — a Token Role (`canvas`, `surface`, `control`, or an Intent:
//   `accent`, `info`, `success`, `warning`, `danger`, `neutral`) or a Material
//   (`MaterialGlass`). `inverse` and `scrim` are treatments a surface takes,
//   not Token Roles. `fgOn<X>` is the foreground for `bg<X>`.
// • qualifier — `subtle` is an Intent's tint; `sunken`, `raised` and `fade`
//   are the elevation of a surface or a control.
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
  // Danger does not use _70 like the other Intents. The owner is colour-blind,
  // and red._70 looks pink-grey to them, not red.
  danger: red._50,
};

const light = {
  // Foreground — two levels, measured with APCA against every fill they can
  // land on, also with the neutral tint on that fill. `fg` clears the Lc 75
  // body floor, `fgMuted` the Lc 60 non-body floor. contrast/color-ladder.test.ts
  // keeps these floors.
  //
  // In light the worst fill is `bgSurfaceSelectedHover`: fg 90, muted 64. The
  // worst tint is `bgNeutralSubtle` on `bgControlSelected` (gray._90), such
  // as a neutral Badge in a selected row: muted 61.
  //
  // In dark the worst fill is `bgSurfaceSelectedHover`: fg 97, muted 62. The
  // worst tint is `bgNeutralSubtle` on gray._13, the fill of
  // `bgSurfaceSelected` and `bgControlHover`: muted 60.
  //
  // In both themes, `bgNeutralSubtle` on `bgSurfaceSelectedHover` gives muted
  // 57, under the floor. A neutral Badge on a selected option card under the
  // pointer has this contrast.
  //
  // gray._70 and gray._80 are too near `fg` in dark: done and secondary text
  // did not recede as they do in light.
  fg: gray._5,
  fgMuted: gray._30,
  // The label of an unselected item in a group of controls, such as a
  // SegmentedControl option or a TabBar tab. It is as dim as `fgMuted`, so
  // the selected item, in `fg`, stands out from it.
  // `fgControlSelected` is the label of the selected item where its colour
  // marks the selection, such as the shown tab of a TabBar.
  fgControl: gray._30,
  fgControlSelected: purple._30,
  fgOnControlBright: gray._20,
  // The same white in both themes, on the off and the on fill alike (the
  // thumb of a switch).
  fgOnControlStrong: gray._100,
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
  // A surface that the visitor can choose, such as an option card. Each state
  // is one step further from the page: rest, hover, selected, selected hover.
  // The selected edge has the colour of `fg`, as the filled mark has. A grey
  // fill alone looks like a disabled field on the page.
  bgSurfaceHover: gray._95,
  bgSurfaceSelected: gray._90,
  // The palette has no step between the selected fill and the next step, and
  // that step is too heavy. Thus this token mixes the two steps.
  bgSurfaceSelectedHover: `color-mix(in oklab, ${gray._90}, ${gray._80})`,
  borderSurfaceSelected: gray._5,

  // A bright control stays light in both themes (a slider thumb).
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
  // A control that is transparent at rest can land on the canvas or on any
  // surface, so this tone must be different from all of them.
  bgControlHover: gray._95,
  bgControlPressed: gray._92,
  bgControlSelected: gray._90,
  bgControlDisabled: gray._95,
  // The track that holds a group of controls, such as the options of a
  // SegmentedControl, and the selected item raised on it. The raised fill
  // holds the label of the selected item, in `fg` or `fgControlSelected`, and
  // a StatusDot. An unselected label in `fgControl` crosses it only while the
  // indicator moves. In dark that label is Lc 58 on it, under the floor.
  bgControlSunken: gray._92,
  bgControlRaised: gray._100,
  // A neutral fill for an unselected control when the fill is its only sign,
  // such as an off switch. Selected, it takes `bgControlStrongSelected`. Its
  // foreground is `fgOnControlStrong` in both states.
  bgControlStrong: gray._40,
  bgControlStrongSelected: purple._40,
  // The ring inside the edge of `bgControlStrong`. WCAG 1.4.11 sets a 3:1
  // floor on the fill or on this ring against every surface a control sits
  // on. In light the fill holds it, so there is no ring. In dark the fill is
  // darker, so the ring holds it.
  borderControlStrong: "transparent",

  // The quiet default edge and the neutral Intent's border.
  border: gray._87,
  // The edge that is the only sign of an unselected control, such as an empty
  // checkbox or radio. It is not quiet, because WCAG 1.4.11 sets a 3:1 floor on
  // it against every surface a control sits on.
  borderControl: gray._40,
  // The edge of `bgControlSunken`.
  borderControlSunken: gray._92,
  // The edge of a text field at rest: firmer than `border`, so that an empty
  // field does not look disabled, and still well below the 3:1 of
  // `borderControl`, so that a form stays quiet.
  borderField: gray._80,

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
  bgNeutralSubtle: `rgba(${gray_rgb._30}, 0.1)`,
  fgOnNeutral: gray._0,

  // Glass — the translucent fill over the blur, the hairline rim all the way
  // round, and the light on that rim. Against a light page the rim reads as a
  // dark edge; against a dark one it is clear, and only the light on it shows.
  bgMaterialGlass: `rgba(${gray_rgb._100}, 0.8)`,
  borderMaterialGlass: `rgba(${gray_rgb._0}, 0.3)`,
  borderMaterialGlassHighlight: `rgba(${gray_rgb._100}, 0.6)`,
  // The tint that marks the selected item on Glass, such as the shown tab of
  // a TabBar.
  bgMaterialGlassSelected: `rgba(${gray_rgb._0}, 0.06)`,
};

const dark: { [key in keyof typeof light]: string } = {
  fg: gray._97,
  fgMuted: gray._60,
  fgControl: gray._60,
  // purple._70 is under the Lc 60 floor on `bgControlRaised` (gray._20), so
  // the selected label is purple._80.
  fgControlSelected: purple._80,
  fgOnControlBright: gray._0,
  fgOnControlStrong: gray._100,
  fgOnInverse: gray._20,
  fgOnScrim: gray._100,

  bgCanvas: gray._0,
  bgCanvasFade: gray._0,

  bgSurface: gray._5,
  bgSurfaceSunken: gray._2,
  bgSurfaceRaised: gray._7,
  bgSurfaceFade: gray._5,
  bgSurfaceHover: gray._9,
  bgSurfaceSelected: gray._13,
  bgSurfaceSelectedHover: `color-mix(in oklab, ${gray._13}, ${gray._20})`,
  borderSurfaceSelected: gray._97,

  bgControlBright: gray._80,
  bgInverse: gray._92,
  bgScrim: "rgba(0, 0, 0, 0.7)",

  bgControl: gray._7,
  bgControlHover: gray._13,
  // The selected fill is darker than the hover fill. A selected area can be
  // large, such as the Net worth card, and a lighter fill is too bright there.
  // Near black, a step looks smaller than the same step near white, so this
  // fill is two tones from `bgSurface`. With gray._9 a selected row was
  // almost the same as its neighbours.
  // The pressed fill is the selected fill, and this is intended: a press
  // shows the fill that the item has when it is selected. gray._9 is the only
  // free tone, and it is almost the same as `bgControl` (1.06:1).
  bgControlSelected: gray._11,
  bgControlPressed: gray._11,
  bgControlDisabled: gray._5,
  bgControlSunken: gray._7,
  bgControlRaised: gray._20,
  bgControlStrong: gray._30,
  bgControlStrongSelected: purple._40,
  borderControlStrong: gray._35,

  border: gray._13,
  borderControl: gray._35,
  borderControlSunken: gray._11,
  borderField: gray._13,

  bgAccent: darkIntentTone.accent,
  bgAccentHover: purple._80,
  bgAccentSubtle: `rgba(${purple_rgb._50}, 0.12)`,
  borderAccent: darkIntentTone.accent,
  fgAccent: purple._80,
  fgOnAccent: gray._0,

  bgInfo: darkIntentTone.info,
  bgInfoHover: blue._80,
  bgInfoSubtle: `rgba(${blue_rgb._50}, 0.14)`,
  borderInfo: darkIntentTone.info,
  fgInfo: blue._80,
  fgOnInfo: gray._0,

  bgSuccess: darkIntentTone.success,
  bgSuccessHover: green._80,
  bgSuccessSubtle: `rgba(${green_rgb._50}, 0.14)`,
  borderSuccess: darkIntentTone.success,
  fgSuccess: green._80,
  fgOnSuccess: gray._0,

  bgWarning: darkIntentTone.warning,
  bgWarningHover: orange._80,
  bgWarningSubtle: `rgba(${orange_rgb._50}, 0.16)`,
  borderWarning: darkIntentTone.warning,
  fgWarning: orange._80,
  fgOnWarning: gray._0,

  bgDanger: darkIntentTone.danger,
  // The label on red._50 is white, not black: APCA gives Lc 58 for white and
  // Lc 51 for black. No tone of the ramp lets either clear Lc 60. The hover is
  // darker, because a lighter fill decreases the contrast of the white label.
  bgDangerHover: red._40,
  bgDangerSubtle: `rgba(${red_rgb._50}, 0.14)`,
  borderDanger: darkIntentTone.danger,
  // red._60 is under the Lc 60 floor on gray._13, so the text is red._70.
  fgDanger: red._70,
  fgOnDanger: gray._100,

  bgNeutral: gray._20,
  bgNeutralHover: gray._30,
  // A stronger tint takes `fgMuted` under the Lc 60 floor on gray._13.
  bgNeutralSubtle: `rgba(${gray_rgb._70}, 0.1)`,
  fgOnNeutral: gray._100,

  bgMaterialGlass: `rgba(${gray_rgb._100}, 0.12)`,
  borderMaterialGlass: "transparent",
  borderMaterialGlassHighlight: `rgba(${gray_rgb._100}, 0.25)`,
  bgMaterialGlassSelected: `rgba(${gray_rgb._100}, 0.1)`,
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
  fg: `light-dark(${light.fg}, ${dark.fg})`,
  fgMuted: `light-dark(${light.fgMuted}, ${dark.fgMuted})`,
  fgControl: `light-dark(${light.fgControl}, ${dark.fgControl})`,
  fgControlSelected: `light-dark(${light.fgControlSelected}, ${dark.fgControlSelected})`,
  fgOnControlBright: `light-dark(${light.fgOnControlBright}, ${dark.fgOnControlBright})`,
  fgOnControlStrong: `light-dark(${light.fgOnControlStrong}, ${dark.fgOnControlStrong})`,
  fgOnInverse: `light-dark(${light.fgOnInverse}, ${dark.fgOnInverse})`,
  fgOnScrim: `light-dark(${light.fgOnScrim}, ${dark.fgOnScrim})`,

  bgCanvas: `light-dark(${light.bgCanvas}, ${dark.bgCanvas})`,
  bgCanvasFade: `light-dark(${light.bgCanvasFade}, ${dark.bgCanvasFade})`,

  bgSurface: `light-dark(${light.bgSurface}, ${dark.bgSurface})`,
  bgSurfaceSunken: `light-dark(${light.bgSurfaceSunken}, ${dark.bgSurfaceSunken})`,
  bgSurfaceRaised: `light-dark(${light.bgSurfaceRaised}, ${dark.bgSurfaceRaised})`,
  bgSurfaceFade: `light-dark(${light.bgSurfaceFade}, ${dark.bgSurfaceFade})`,
  bgSurfaceHover: `light-dark(${light.bgSurfaceHover}, ${dark.bgSurfaceHover})`,
  bgSurfaceSelected: `light-dark(${light.bgSurfaceSelected}, ${dark.bgSurfaceSelected})`,
  bgSurfaceSelectedHover: `light-dark(${light.bgSurfaceSelectedHover}, ${dark.bgSurfaceSelectedHover})`,
  borderSurfaceSelected: `light-dark(${light.borderSurfaceSelected}, ${dark.borderSurfaceSelected})`,

  bgControlBright: `light-dark(${light.bgControlBright}, ${dark.bgControlBright})`,
  bgInverse: `light-dark(${light.bgInverse}, ${dark.bgInverse})`,
  bgScrim: `light-dark(${light.bgScrim}, ${dark.bgScrim})`,

  bgControl: `light-dark(${light.bgControl}, ${dark.bgControl})`,
  bgControlHover: `light-dark(${light.bgControlHover}, ${dark.bgControlHover})`,
  bgControlPressed: `light-dark(${light.bgControlPressed}, ${dark.bgControlPressed})`,
  bgControlSelected: `light-dark(${light.bgControlSelected}, ${dark.bgControlSelected})`,
  bgControlDisabled: `light-dark(${light.bgControlDisabled}, ${dark.bgControlDisabled})`,
  bgControlSunken: `light-dark(${light.bgControlSunken}, ${dark.bgControlSunken})`,
  bgControlRaised: `light-dark(${light.bgControlRaised}, ${dark.bgControlRaised})`,
  bgControlStrong: `light-dark(${light.bgControlStrong}, ${dark.bgControlStrong})`,
  bgControlStrongSelected: `light-dark(${light.bgControlStrongSelected}, ${dark.bgControlStrongSelected})`,
  borderControlStrong: `light-dark(${light.borderControlStrong}, ${dark.borderControlStrong})`,

  border: `light-dark(${light.border}, ${dark.border})`,
  borderControl: `light-dark(${light.borderControl}, ${dark.borderControl})`,
  borderControlSunken: `light-dark(${light.borderControlSunken}, ${dark.borderControlSunken})`,
  borderField: `light-dark(${light.borderField}, ${dark.borderField})`,

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
  bgMaterialGlassSelected: `light-dark(${light.bgMaterialGlassSelected}, ${dark.bgMaterialGlassSelected})`,
});
