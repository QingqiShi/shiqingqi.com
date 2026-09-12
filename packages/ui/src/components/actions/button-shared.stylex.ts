import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "../../breakpoints.stylex.ts";
import { cornerTokens } from "../../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../../primitives/motion.stylex.ts";
import { border, color, controlSize, font } from "../../tokens.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

// Can't use a `transition.*` preset for a compound transform+filter
// transition; the durations and easings still come from the shared motion
// tokens, so it tracks the scale.
const pressTransition = `background ${duration._200} ${easing.ease}, transform ${duration._150} ${easing.easeOut}, filter ${duration._150} ${easing.easeOut}`;
const releaseTransition = `background ${duration._200} ${easing.ease}, transform ${duration._300} ${easing.easeOut}, filter ${duration._300} ${easing.easeOut}`;
const reducedTransition = `background ${duration._200} ${easing.ease}`;

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
    fontSize: font.uiControl,
    fontWeight: font.weight_5,
    color: buttonTokens.color,
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
      ":disabled:hover": buttonTokens.backgroundColorDisabledHover,
    },
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    touchAction: "manipulation",
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
  },
  hideLabelBelowMd: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  active: {
    [buttonTokens.color]: {
      default: color.accentOn,
      ":hover": color.accentOn,
    },
    backgroundColor: {
      default: color.accent,
      ":hover": color.accentHover,
      ":disabled:hover": color.accent,
    },
  },
  bright: {
    backgroundColor: color.bgSurfaceBright,
    [buttonTokens.color]: color.textOnBright,
    filter: {
      default: "brightness(1)",
      ":hover": "brightness(1.1)",
    },
  },
  pressed: {
    transform: {
      default:
        "scale(1.05) translate(var(--button-nudge-x, 0), var(--button-nudge-y, 0))",
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
// highlight `isActive` paints.
export const lookStyles = stylex.create({
  outline: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
  },
  // The quietest look: no surface, and the label drains to muted until the
  // pointer arrives. `:disabled:hover` keeps it drained, matching the fill.
  ghost: {
    [buttonTokens.backgroundColor]: "transparent",
    [buttonTokens.backgroundColorHover]: color.bgInteractiveHover,
    [buttonTokens.backgroundColorDisabledHover]: "transparent",
    [buttonTokens.boxShadow]: "none",
    [buttonTokens.color]: {
      default: color.textMuted,
      ":hover": color.textMain,
      ":disabled:hover": color.textMuted,
    },
  },
  danger: {
    [buttonTokens.backgroundColor]: color.danger,
    [buttonTokens.backgroundColorHover]: color.dangerHover,
    [buttonTokens.backgroundColorDisabledHover]: color.danger,
    [buttonTokens.color]: color.dangerOn,
  },
});

// Each size drives `buttonTokens.height` and scales label size and padding to
// match. `md` reproduces the historic default, so callers that omit `size`
// are unaffected.
export const sizeStyles = stylex.create({
  sm: {
    [buttonTokens.height]: controlSize._8,
    [buttonTokens.paddingInline]: controlSize._2,
    fontSize: font.uiBodySmall,
    gap: controlSize._1,
    paddingBlock: controlSize._0,
  },
  md: {
    [buttonTokens.height]: controlSize._9,
  },
  lg: {
    [buttonTokens.height]: controlSize._10,
    [buttonTokens.paddingInline]: controlSize._4,
    fontSize: font.uiHeading2,
    paddingBlock: controlSize._2,
  },
});
