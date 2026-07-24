import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Iconography foundation-card illustration: a 3x3 grid of Phosphor-style
 * outline icons plus a toggle, lit by a spotlight that follows the cursor —
 * dim at rest, warming to gold as the card comes alive.
 */
export function IconographyIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-iconography-ico-glow" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.8"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="dsi-iconography-spot-glow"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.85"
          />
          <stop
            offset="42%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.42"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nudged down so the icon lattice sits nearer the card's bottom edge,
          trimming the empty band the art used to leave below it. */}
      <g transform="translate(0, 16)">
        <g css={styles.bloom}>
          <circle
            cx="252"
            cy="100"
            r="72"
            fill="url(#dsi-iconography-ico-glow)"
          />
        </g>

        <g css={styles.spot}>
          <circle cx="0" cy="0" r="44" fill="url(#dsi-iconography-spot-glow)" />
        </g>

        <g
          css={styles.icons}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g transform="translate(213 62)">
            <circle cx="-2" cy="-2" r="6.2" />
            <line x1="2.4" y1="2.4" x2="7.4" y2="7.4" />
          </g>
          <g transform="translate(252 62)">
            <path d="M -6 4 C -6 4 -4.4 2.4 -4.4 -1 A 4.4 4.4 0 0 1 4.4 -1 C 4.4 2.4 6 4 6 4 Z" />
            <path d="M -1.9 4 A 1.9 1.9 0 0 0 1.9 4" />
          </g>
          <g transform="translate(291 62)">
            <path d="M 0 6 C -7.6 0.6 -6 -6 -2.4 -6 C -0.4 -6 0 -4.1 0 -4.1 C 0 -4.1 0.4 -6 2.4 -6 C 6 -6 7.6 0.6 0 6 Z" />
          </g>

          <g transform="translate(213 101)">
            <path d="M 7.6 0 L 4.62 1.91 L 5.37 5.37 L 1.91 4.62 L 0 7.6 L -1.91 4.62 L -5.37 5.37 L -4.62 1.91 L -7.6 0 L -4.62 -1.91 L -5.37 -5.37 L -1.91 -4.62 L 0 -7.6 L 1.91 -4.62 L 5.37 -5.37 L 4.62 -1.91 Z" />
            <circle cx="0" cy="0" r="2.6" />
          </g>
          <g transform="translate(252 101)">
            <circle cx="0" cy="-3.2" r="3.3" />
            <path d="M -5.6 6.2 C -5.6 1.7 -3 0.2 0 0.2 C 3 0.2 5.6 1.7 5.6 6.2" />
          </g>
          <g transform="translate(291 101)">
            <rect x="-6.5" y="-5" width="13" height="11.5" rx="2" />
            <line x1="-6.5" y1="-1" x2="6.5" y2="-1" />
            <line x1="-3.2" y1="-7.2" x2="-3.2" y2="-3" />
            <line x1="3.2" y1="-7.2" x2="3.2" y2="-3" />
          </g>

          <g transform="translate(213 140)">
            <circle cx="0" cy="0" r="7.2" />
            <line x1="0" y1="-3.6" x2="0" y2="3.6" />
            <line x1="-3.6" y1="0" x2="3.6" y2="0" />
          </g>
          <g transform="translate(252 140)">
            <rect x="-8.5" y="-4.8" width="17" height="9.6" rx="4.8" />
            <circle css={styles.toggleKnob} cx="3.6" cy="0" r="3" />
          </g>
          <g transform="translate(291 140)">
            <path d="M 6 0.5 L 6 6 L -6 6 L -6 -6 L -0.5 -6" />
            <line x1="-0.5" y1="0.5" x2="6.5" y2="-6.5" />
            <path d="M 1.8 -6.5 L 6.5 -6.5 L 6.5 -1.8" />
          </g>
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.72,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.82)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms cubic-bezier(0.32, 0.72, 0, 1), transform 520ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Spotlight transform follows the pointer via --ds-illo-px/py; parks at the
  // grid centre under reduced motion.
  spot: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(210px + var(--ds-illo-px, 0.5) * 82px), calc(60px + var(--ds-illo-py, 0.5) * 80px))",
      [motionConstants.REDUCED_MOTION]: "translate(251px, 100px)",
    },
    transition: {
      default:
        "opacity 420ms cubic-bezier(0.32, 0.72, 0, 1), transform 200ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  icons: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.94,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3px), calc(var(--ds-illo-my) * 3px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 480ms ease, stroke 480ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 480ms ease, stroke 480ms ease",
    },
  },
  toggleKnob: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    stroke: "none",
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "translateX(-7px)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "translateX(0px)",
    },
    transition: {
      default:
        "transform 420ms var(--ds-illo-ease), fill 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
