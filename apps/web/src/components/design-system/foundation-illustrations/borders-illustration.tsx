import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Borders foundation-card illustration: nested concentric rounded frames plus a
 * dashed frame, dim grey at rest -> warm gold on hover.
 */
export function BordersIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-borders-hue" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.72"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-borders-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        css={styles.inkGlow}
        cx="300"
        cy="150"
        r="96"
        fill="url(#dsi-borders-ink)"
      />

      <circle
        css={styles.bloom}
        cx="298"
        cy="146"
        r="108"
        fill="url(#dsi-borders-hue)"
      />

      <g css={styles.frames}>
        {/* Drawn first so the keylines paint over its edge; borrows ring-6's
            transform so the dark corner patch stays glued to the core keyline. */}
        <rect
          css={[
            styles.coreFill,
            styles.ringGroup,
            styles.ring6,
            styles.coreFillRing6,
          ]}
          x="298"
          y="140"
          width="90"
          height="96"
          rx="15"
          fill="rgb(0 0 0 / 0.4)"
        />

        <g
          css={styles.grey}
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          <rect
            css={[styles.ringGroup, styles.ring2]}
            x="182"
            y="58"
            width="206"
            height="178"
            rx="46"
            strokeWidth="1.4"
            strokeDasharray="6 7"
          />
          <rect
            css={[styles.ringGroup, styles.ring4]}
            x="244"
            y="104"
            width="144"
            height="132"
            rx="30"
            strokeWidth="1.6"
          />
          <rect
            css={[styles.ringGroup, styles.ring5]}
            x="272"
            y="124"
            width="116"
            height="112"
            rx="23"
            strokeWidth="1.6"
          />
          <rect
            css={[styles.ringGroup, styles.ring6]}
            x="298"
            y="140"
            width="90"
            height="96"
            rx="15"
            strokeWidth="1.5"
          />
        </g>

        {/* Each accent frame is drawn twice — grey copy fading out, gold copy fading
            in — to cross-fade grey -> gold on hover; both share ring styles to track together. */}
        <g
          css={styles.accentRest}
          fill="none"
          stroke="var(--ds-illo-ink)"
          strokeLinejoin="round"
        >
          <rect
            css={[styles.ringGroup, styles.ring1]}
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            strokeWidth="1.3"
          />
          <rect
            css={[styles.ringGroup, styles.ring3]}
            x="214"
            y="82"
            width="174"
            height="154"
            rx="38"
            strokeWidth="2.6"
          />
        </g>

        <g css={styles.accentAlive} fill="none" strokeLinejoin="round">
          <rect
            css={[styles.ringGroup, styles.ring1]}
            x="150"
            y="34"
            width="238"
            height="202"
            rx="54"
            stroke="var(--ds-illo-hue-soft)"
            strokeWidth="1.3"
          />
          <rect
            css={[styles.ringGroup, styles.ring3]}
            x="214"
            y="82"
            width="174"
            height="154"
            rx="38"
            stroke="var(--ds-illo-hue)"
            strokeWidth="2.6"
          />
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  inkGlow: {
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 500ms ease",
  },
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.5,
    },
    transformBox: "view-box",
    transformOrigin: "298px 146px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 22px), calc(var(--ds-illo-my) * 16px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 550ms cubic-bezier(0.32, 0.72, 0, 1), transform 440ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  frames: {
    transformBox: "view-box",
    transformOrigin: "300px 150px",
    transform: {
      default: "rotate(calc(var(--ds-illo-mx) * 1.1deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  grey: {
    opacity: {
      default: 0.46,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.58,
    },
    transition: "opacity 450ms ease",
  },
  accentRest: {
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 450ms ease",
  },
  accentAlive: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transition: "opacity 450ms ease",
  },
  coreFill: {
    opacity: {
      default: 0.62,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.92,
    },
  },
  ringGroup: {
    transformBox: "view-box",
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring1: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 2px), calc(var(--ds-illo-my) * 1.6px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring2: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 4px), calc(var(--ds-illo-my) * 3.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring3: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6.5px), calc(var(--ds-illo-my) * 5.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring4: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring5: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 11.5px), calc(var(--ds-illo-my) * 9.2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ring6: {
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 14px), calc(var(--ds-illo-my) * 11px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  coreFillRing6: {
    transition: {
      default: "opacity 500ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
