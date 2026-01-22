import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { color, controlSize } from "#src/tokens.stylex.ts";
import { anchorTokens } from "./anchor.stylex";
import { buttonTokens } from "./button.stylex";

export const PRESS_ANIMATION_DURATION = 150;
const RELEASE_OUTSIDE_ANIMATION_DURATION = 300;

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

export const sharedStyles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: buttonTokens.borderRadius,
    boxShadow: buttonTokens.boxShadow,
    transition: {
      default: `background 0.2s ease, transform ${PRESS_ANIMATION_DURATION}ms ease-out, filter ${PRESS_ANIMATION_DURATION}ms ease-out`,
      [REDUCED_MOTION]: "background 0.2s ease",
    },
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
    },
    // Base transform for pressed state
    transform: "scale(1) translate(0, 0)",
    filter: "brightness(1)",
    // Touch action to prevent browser gestures from interfering
    touchAction: "manipulation",
  },
  hasIcon: {
    paddingLeft: controlSize._2,
  },
  hasIconHideLabel: {
    paddingLeft: { default: controlSize._3, [breakpoints.md]: controlSize._2 },
  },
  icon: {
    display: "inline-flex",
  },
  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
  },
  hideLabelOnMobile: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  active: {
    [buttonTokens.color]: {
      default: color.textOnActive,
      ":hover": color.textOnActive,
    },
    [anchorTokens.color]: {
      default: color.textOnActive,
      ":hover": color.textOnActive,
    },
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled:hover": color.controlActive,
    },
  },
  bright: {
    backgroundColor: color.controlThumb,
    [buttonTokens.color]: color.textOnControlThumb,
    [anchorTokens.color]: color.textOnControlThumb,
    filter: {
      default: "brightness(1)",
      ":hover": "brightness(1.1)",
    },
  },
  pressed: {
    transform: {
      default:
        "scale(1.05) translate(var(--button-nudge-x, 0), var(--button-nudge-y, 0))",
      [REDUCED_MOTION]: "scale(1) translate(0, 0)",
    },
    filter: {
      default: "brightness(1.15)",
      [REDUCED_MOTION]: "brightness(1)",
    },
  },
  pressedBright: {
    filter: {
      default: "brightness(1.25)",
      [REDUCED_MOTION]: "brightness(1)",
    },
  },
  releasedOutside: {
    transition: {
      default: `background 0.2s ease, transform ${RELEASE_OUTSIDE_ANIMATION_DURATION}ms ease-out, filter ${RELEASE_OUTSIDE_ANIMATION_DURATION}ms ease-out`,
      [REDUCED_MOTION]: "background 0.2s ease",
    },
  },
});
