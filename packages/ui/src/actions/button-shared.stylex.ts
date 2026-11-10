import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { cornerTokens } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { controlHeight, controlSize, font } from "../tokens.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

// Can't use a `transition.*` preset for a compound transform+filter
// transition; the durations and easings still come from the shared motion
// tokens, so it tracks the scale.
const pressTransition = `background ${duration._200} ${easing.ease}, transform ${duration._500} ${easing.spring}, filter ${duration._150} ${easing.easeOut}`;
const releaseTransition = `background ${duration._200} ${easing.ease}, transform ${duration._1000} ${easing.spring}, filter ${duration._300} ${easing.easeOut}`;
const reducedTransition = `background ${duration._200} ${easing.ease}`;

/**
 * How far a pressed control follows a pointer that drifts off it.
 * `usePressHandlers` sets both on the pressed element through `pressedCss`.
 * A style that wears the press reads them in its `translate`.
 */
export const pressNudgeTokens = stylex.defineVars({
  x: "0px",
  y: "0px",
});

export const sharedStyles = stylex.create({
  base: {
    // Anchors a button's busy spinner overlay outside the flow, so it doesn't
    // change the control's width.
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    // Border-box so an outline's hairline and an anchor's padding sit inside
    // the height the size step set, keeping every form the same height.
    boxSizing: "border-box",
    gap: controlSize._2,
    paddingBlock: controlSize._1,
    paddingInline: buttonTokens.paddingInline,
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    [cornerTokens.height]: buttonTokens.height,
    // The one height guarantee, shared by every form of the control. A minimum
    // rather than a height, because the icon-only variants below set
    // `blockSize: auto` above their breakpoint and would otherwise win.
    minBlockSize: buttonTokens.height,
    boxShadow: buttonTokens.boxShadow,
    transition: {
      default: pressTransition,
      [motionConstants.REDUCED_MOTION]: reducedTransition,
    },
    // A `<button>` takes neither the page's font nor its colour by
    // inheritance, so both are declared here for the `<a>` form to match.
    fontFamily: font.family,
    fontWeight: font.weight_5,
    color: buttonTokens.color,
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      [pointer.canHover]: {
        default: null,
        ":hover": buttonTokens.backgroundColorHover,
        ":disabled:hover": buttonTokens.backgroundColorDisabledHover,
      },
    },
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    // The corner (`corner.squircle_round`, closing at half the height set
    // above) and the focus ring (WCAG 2.4.7, `a11y.focusRing`) are composed at
    // the call site, so every button look shares one shape and one
    // indicator.
  },
  hasIcon: {
    paddingInlineStart: controlSize._2,
  },
  // With no label to pad, the button is a square of its own height, so a row
  // of icon-only buttons reads as one size rather than as narrow pills. The
  // height is fixed too, so a stretching container cannot pull it tall.
  iconOnly: {
    inlineSize: buttonTokens.height,
    blockSize: buttonTokens.height,
    paddingInlineStart: 0,
    paddingInlineEnd: 0,
  },
  iconOnlyBelowMd: {
    inlineSize: { default: buttonTokens.height, [breakpoints.md]: "auto" },
    blockSize: { default: buttonTokens.height, [breakpoints.md]: "auto" },
    paddingInlineStart: { default: 0, [breakpoints.md]: controlSize._2 },
    paddingInlineEnd: {
      default: 0,
      [breakpoints.md]: buttonTokens.paddingInline,
    },
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
  },

  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    // A label that truncates needs this, because a flex item stops at its
    // content width by default.
    minInlineSize: 0,
  },
  hideLabelBelowMd: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  active: {
    [buttonTokens.color]: color.fgOnAccent,
    backgroundColor: {
      default: color.bgAccent,
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgAccentHover,
        ":disabled:hover": color.bgAccent,
      },
    },
  },
  pressed: {
    transform: {
      default: `scale(1.05) translate(${pressNudgeTokens.x}, ${pressNudgeTokens.y})`,
      [motionConstants.REDUCED_MOTION]: "scale(1) translate(0, 0)",
    },
    filter: {
      default: "brightness(1.15)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  pressedBright: {
    filter: {
      default: "brightness(1.25)",
      [motionConstants.REDUCED_MOTION]: "brightness(1)",
    },
  },
  releasedOutside: {
    transition: {
      default: releaseTransition,
      [motionConstants.REDUCED_MOTION]: reducedTransition,
    },
  },
});

// Each look re-points the shared `buttonTokens` knobs instead of declaring
// its own colours, so the skin travels to anything else reading them.
// `"primary"` is absent because it reuses `sharedStyles.active`, the same
// highlight `isActive` paints. `outline` takes its border and its fill from
// `outlineSurface`, which an element that is not a `Button` composes too.
export const lookStyles = stylex.create({
  outline: {
    [buttonTokens.boxShadow]: "none",
  },
  bright: {
    backgroundColor: color.bgControlBright,
    [buttonTokens.color]: color.fgOnControlBright,
    filter: {
      default: "brightness(1)",
      ":hover": {
        default: null,
        [pointer.canHover]: "brightness(1.1)",
      },
    },
  },
  // The quietest look: no surface, and the label drains to muted until the
  // pointer arrives. `:disabled:hover` keeps it drained, matching the fill.
  ghost: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgControlHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    [buttonTokens.color]: {
      default: color.fg,
      [pointer.canHover]: {
        default: color.fgMuted,
        ":hover": color.fg,
        ":disabled:hover": color.fgMuted,
      },
    },
  },
  danger: {
    [buttonTokens.backgroundColor]: color.bgDanger,
    [buttonTokens.backgroundColorHover]: color.bgDangerHover,
    [buttonTokens.backgroundColorDisabledHover]: color.bgDanger,
    [buttonTokens.color]: color.fgOnDanger,
  },
});

// The glyph of an icon-only button. It reads `buttonTokens.glyph`, which
// `sizeStyles` sets per size and the bleed reads too. `iconOnlyBelowMd` is
// for a button that shows its label from `md` up.
export const iconGlyphStyles = stylex.create({
  iconOnly: { fontSize: buttonTokens.glyph },
  iconOnlyBelowMd: {
    fontSize: { default: buttonTokens.glyph, [breakpoints.md]: "inherit" },
  },
});

// Below `md`, the glyph of a button that shows its label from `md` up stands
// for a word in a row of text, such as Undo at the end of each line of a log.
// A column of lone-control glyphs there outweighs the text, so this glyph is
// one step smaller.
export const glyphBelowMdTokenStyles = stylex.create({
  xs: { [buttonTokens.glyph]: controlSize._3 },
  sm: { [buttonTokens.glyph]: controlSize._4 },
  md: { [buttonTokens.glyph]: controlSize._4 },
  lg: { [buttonTokens.glyph]: controlSize._5 },
});

// A secondary destructive action. The label turns danger and the hover fill
// is a danger tint, while the edge of `outline` stays neutral, so the button
// keeps the weight of the buttons beside it. `look="danger"` is the filled
// form, for the one action that destroys.
export const dangerIntentStyles = stylex.create({
  ghost: {
    [buttonTokens.color]: color.fgDanger,
    [buttonTokens.backgroundColorHover]: color.bgDangerSubtle,
  },
  outline: {
    [buttonTokens.color]: color.fgDanger,
    backgroundColor: {
      default: "transparent",
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgDangerSubtle,
        ":disabled:hover": "transparent",
      },
    },
  },
});

// A negative margin as large as the space between the box and its content,
// so that the content, not the box, meets the edge of the content column.
const iconOnlyInset = `calc((${buttonTokens.glyph} - ${buttonTokens.height}) / 2)`;
const labelInset = `calc(-1 * ${buttonTokens.paddingInline})`;
const iconInset = `calc(-1 * ${controlSize._2})`;

export const bleedStyles = stylex.create({
  startLabel: { marginInlineStart: labelInset },
  startIcon: { marginInlineStart: iconInset },
  startIconOnly: { marginInlineStart: iconOnlyInset },
  startIconOnlyBelowMd: {
    marginInlineStart: { default: iconOnlyInset, [breakpoints.md]: iconInset },
  },
  endLabel: { marginInlineEnd: labelInset },
  endIconOnly: { marginInlineEnd: iconOnlyInset },
  endIconOnlyBelowMd: {
    marginInlineEnd: { default: iconOnlyInset, [breakpoints.md]: labelInset },
  },
});

// Each size drives `buttonTokens.height` and scales padding to match. The
// label size comes from a type role composed before `sharedStyles.base`:
// `caption` for `xs`, `label` for `sm`, `control` for `md`, `h2` for `lg`.
export const sizeStyles = stylex.create({
  xs: {
    [buttonTokens.height]: controlHeight.xs,
    [buttonTokens.glyph]: controlSize._4,
    [buttonTokens.paddingInline]: controlSize._2,
    gap: controlSize._1,
    paddingBlock: controlSize._0,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  sm: {
    [buttonTokens.height]: controlHeight.sm,
    [buttonTokens.paddingInline]: controlSize._2,
    gap: controlSize._1,
    paddingBlock: controlSize._0,
  },
  md: {
    [buttonTokens.height]: controlHeight.md,
  },
  lg: {
    [buttonTokens.height]: controlHeight.lg,
    [buttonTokens.glyph]: controlSize._6,
    [buttonTokens.paddingInline]: controlSize._4,
    paddingBlock: controlSize._2,
  },
});
