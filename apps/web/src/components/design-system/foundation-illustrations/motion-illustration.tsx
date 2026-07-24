import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

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
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.8" />
          <stop offset="55%" stopColor="var(--ds-illo-ink)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-bloom-hue" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.42"
          />
          <stop offset="40%" stopColor="var(--ds-illo-hue)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-motion-mo-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop
            offset="34%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.95"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nudged down so the curve sits nearer the card's bottom edge, trimming
          the empty band the art used to leave below it. */}
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
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 520ms ease",
  },
  bloomHue: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.6,
    },
    transition: "opacity 520ms ease",
  },
  grid: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 340ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  gridPath: {
    fill: "none",
    stroke: "var(--ds-illo-ink)",
    strokeWidth: 1,
    strokeLinecap: "round",
    opacity: {
      default: 0.075,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.155,
    },
    transition: "opacity 520ms ease",
  },
  curveGlowWide: {
    fill: "none",
    stroke: "var(--ds-illo-hue-soft)",
    strokeWidth: 13,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.38,
    },
    filter: "blur(6px)",
    transition: "opacity 520ms ease",
  },
  curveGlow: {
    fill: "none",
    stroke: "var(--ds-illo-hue-soft)",
    strokeWidth: 5,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.7,
    },
    filter: "blur(2.2px)",
    transition: "opacity 520ms ease",
  },
  curveInk: {
    fill: "none",
    stroke: "var(--ds-illo-ink)",
    strokeWidth: 2,
    strokeLinecap: "round",
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 460ms ease",
  },
  curveHue: {
    fill: "none",
    stroke: "var(--ds-illo-hue)",
    strokeWidth: 2,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transition: "opacity 460ms ease",
  },
  linear: {
    fill: "none",
    stroke: "var(--ds-illo-ink)",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeDasharray: "3 4.5",
    opacity: {
      default: 0.24,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.4,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 6px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 520ms ease, transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  // Halo opacity gates off at rest and on via when.ancestor hover, but keeps the
  // --ds-illo-px pointer term so the lit endpoint tracks which way the cursor leans.
  endpointGlow: {
    transition: "opacity 420ms ease",
  },
  endpointStart: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "calc(0.35 + 0.55 * (1 - var(--ds-illo-px, 0.5)))",
    },
  },
  endpointEnd: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "calc(0.35 + 0.55 * var(--ds-illo-px, 0.5))",
    },
  },
  endpointRest: {
    fill: "var(--ds-illo-ink)",
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 420ms ease",
  },
  endpointLive: {
    fill: "#ffffff",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transition: "opacity 420ms ease",
  },
  // The dot scrubs the curve: cometCircle's offset-path traces it and offset-distance
  // maps the pointer --ds-illo-px (0->1) onto it; ghosts lag progressively into a tail.
  comet: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transition: "opacity 420ms ease",
  },
  cometCircle: {
    offsetPath: 'path("M210,150 C258,150 252,60 300,60")',
    offsetRotate: "0deg",
    offsetDistance: {
      default: "calc(var(--ds-illo-px, 0.5) * 100%)",
      [motionConstants.REDUCED_MOTION]: "50%",
    },
  },
  head: {
    transition: {
      default: "offset-distance 170ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g1: {
    opacity: 0.8,
    transition: {
      default: "offset-distance 240ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g2: {
    opacity: 0.6,
    transition: {
      default: "offset-distance 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g3: {
    opacity: 0.42,
    transition: {
      default: "offset-distance 410ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  g4: {
    opacity: 0.28,
    transition: {
      default: "offset-distance 520ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
