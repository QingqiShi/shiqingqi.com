import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import {
  motionConstants,
  duration,
  easing,
} from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase, illoVars } from "./illustration.stylex.ts";

/**
 * Motion foundation-card illustration: an ease-in-out easing curve with a dot
 * that scrubs along it under the pointer trailing a comet tail, dim at rest and
 * warming to life on hover.
 */
export function MotionIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-motion-mo-bloom-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={illoVars.ink} stopOpacity="0.8" />
          <stop offset="55%" stopColor={illoVars.ink} stopOpacity="0.1" />
          <stop offset="100%" stopColor={illoVars.ink} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-bloom-hue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={illoVars.hueSoft} stopOpacity="0.42" />
          <stop offset="40%" stopColor={illoVars.hue} stopOpacity="0.1" />
          <stop offset="100%" stopColor={illoVars.hue} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="34%" stopColor={illoVars.hueSoft} stopOpacity="0.95" />
          <stop offset="100%" stopColor={illoVars.hue} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nudged down so the curve sits nearer the card's bottom edge, trimming
          the empty band the illustration used to leave below it. */}
      <g transform="translate(0, 14)">
        <g>
          <circle
            css={styles.bloomInk}
            cx="262"
            cy="112"
            r="78"
            fill="url(#dsi-motion-mo-bloom-ink)"
          />
          <circle
            css={styles.bloomHue}
            cx="270"
            cy="118"
            r="62"
            fill="url(#dsi-motion-mo-bloom-hue)"
          />
        </g>

        <g css={styles.grid}>
          <path css={styles.gridPath} d="M210,60 L210,150" />
          <path css={styles.gridPath} d="M240,60 L240,150" />
          <path css={styles.gridPath} d="M270,60 L270,150" />
          <path css={styles.gridPath} d="M300,60 L300,150" />
          <path css={styles.gridPath} d="M210,60 L300,60" />
          <path css={styles.gridPath} d="M210,90 L300,90" />
          <path css={styles.gridPath} d="M210,120 L300,120" />
          <path css={styles.gridPath} d="M210,150 L300,150" />
        </g>

        <path css={styles.linear} d="M210,150 C265,150 288,112 300,60" />

        <path css={styles.curveGlowWide} d="M210,150 C258,150 252,60 300,60" />
        <path css={styles.curveGlow} d="M210,150 C258,150 252,60 300,60" />
        <path css={styles.curveInk} d="M210,150 C258,150 252,60 300,60" />
        <path css={styles.curveHue} d="M210,150 C258,150 252,60 300,60" />

        <circle
          css={[styles.endpointGlow, styles.endpointStart]}
          cx="210"
          cy="150"
          r="12"
          fill="url(#dsi-motion-mo-orb)"
        />
        <circle
          css={[styles.endpointGlow, styles.endpointEnd]}
          cx="300"
          cy="60"
          r="12"
          fill="url(#dsi-motion-mo-orb)"
        />

        <circle css={styles.endpointRest} cx="210" cy="150" r="4" />
        <circle css={styles.endpointRest} cx="300" cy="60" r="4" />

        <circle css={styles.endpointLive} cx="210" cy="150" r="3.4" />
        <circle css={styles.endpointLive} cx="300" cy="60" r="3.4" />

        <g css={styles.comet}>
          <circle
            css={[styles.cometCircle, styles.g4]}
            r="2.4"
            fill="url(#dsi-motion-mo-orb)"
          />
          <circle
            css={[styles.cometCircle, styles.g3]}
            r="3"
            fill="url(#dsi-motion-mo-orb)"
          />
          <circle
            css={[styles.cometCircle, styles.g2]}
            r="3.6"
            fill="url(#dsi-motion-mo-orb)"
          />
          <circle
            css={[styles.cometCircle, styles.g1]}
            r="4.4"
            fill="url(#dsi-motion-mo-orb)"
          />
          <circle
            css={[styles.cometCircle, styles.head]}
            r="5.6"
            fill="url(#dsi-motion-mo-orb)"
          />
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  bloomInk: {
    opacity: {
      default: 0.2,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  bloomHue: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.6,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.6,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  grid: {
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 5px), calc(${illoVars.my} * 4px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._500} ${easing.ease}`,
    },
  },
  gridPath: {
    fill: "none",
    stroke: illoVars.ink,
    strokeWidth: 1,
    strokeLinecap: "round",
    opacity: {
      default: 0.075,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.155,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.155,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  curveGlowWide: {
    fill: "none",
    stroke: illoVars.hueSoft,
    strokeWidth: 13,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.38,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.38,
      },
    },
    filter: "blur(6px)",
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  curveGlow: {
    fill: "none",
    stroke: illoVars.hueSoft,
    strokeWidth: 5,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.7,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.7,
      },
    },
    filter: "blur(2.2px)",
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  curveInk: {
    fill: "none",
    stroke: illoVars.ink,
    strokeWidth: 2,
    strokeLinecap: "round",
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  curveHue: {
    fill: "none",
    stroke: illoVars.hue,
    strokeWidth: 2,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.95,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.95,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  linear: {
    fill: "none",
    stroke: illoVars.ink,
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeDasharray: "3 4.5",
    opacity: {
      default: 0.24,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.4,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.4,
      },
    },
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 9px), calc(${illoVars.my} * 6px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `opacity ${duration._500} ${easing.ease}, transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._500} ${easing.ease}`,
    },
  },
  // Opacity gates off at rest and on via when.ancestor hover, but keeps the
  // `illoVars.px` pointer term so the lit endpoint tracks which way the cursor leans.
  endpointGlow: {
    transition: `opacity ${duration._400} ${easing.ease}`,
  },
  endpointStart: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        `calc(0.35 + 0.55 * (1 - ${illoVars.px}))`,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          `calc(0.35 + 0.55 * (1 - ${illoVars.px}))`,
      },
    },
  },
  endpointEnd: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        `calc(0.35 + 0.55 * ${illoVars.px})`,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          `calc(0.35 + 0.55 * ${illoVars.px})`,
      },
    },
  },
  endpointRest: {
    fill: illoVars.ink,
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: `opacity ${duration._400} ${easing.ease}`,
  },
  endpointLive: {
    fill: "#ffffff",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `opacity ${duration._400} ${easing.ease}`,
  },
  // The dot scrubs the curve: cometCircle's offset-path traces it and offset-distance
  // maps the pointer `illoVars.px` (0->1) onto it; ghosts lag progressively into a tail.
  comet: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `opacity ${duration._400} ${easing.ease}`,
  },
  cometCircle: {
    offsetPath: 'path("M210,150 C258,150 252,60 300,60")',
    offsetRotate: "0deg",
    offsetDistance: {
      default: `calc(${illoVars.px} * 100%)`,
      [motionConstants.REDUCED_MOTION]: "50%",
    },
  },
  head: {
    transition: {
      default: `offset-distance ${duration._300} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g1: {
    opacity: 0.8,
    transition: {
      default: `offset-distance ${duration._400} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g2: {
    opacity: 0.6,
    transition: {
      default: `offset-distance ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g3: {
    opacity: 0.42,
    transition: {
      default: `offset-distance ${duration._700} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g4: {
    opacity: 0.28,
    transition: {
      default: `offset-distance ${duration._1000} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
