import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Spacing foundation-card illustration: a rem-based spacing scale drawn as seven
 * rounded bars growing in height left -> right (0.25 -> 4), each with a value
 * label and dashed leader. Dim neutral grey at rest, warming to a gold bloom on
 * hover.
 */
const BASELINE = 170;

const BARS = [
  { label: "0.25", x: 2, width: 24, height: 22, labelY: 116 },
  { label: "0.5", x: 38, width: 26, height: 34, labelY: 108 },
  { label: "1", x: 76, width: 28, height: 50, labelY: 96 },
  { label: "1.5", x: 116, width: 32, height: 68, labelY: 84 },
  { label: "2", x: 160, width: 38, height: 86, labelY: 70 },
  { label: "3", x: 210, width: 44, height: 108, labelY: 50 },
  { label: "4", x: 266, width: 54, height: 130, labelY: 30 },
];

export function SpacingIllustration() {
  return (
    <svg
      css={[illoBase.svg, styles.svg]}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-spacing-sp-glow" cx="50%" cy="50%" r="50%">
          <stop css={styles.glowStop0} offset="0%" />
          <stop css={styles.glowStop1} offset="55%" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dsi-spacing-sp-face" x1="0" y1="0" x2="0" y2="1">
          <stop css={styles.faceStop0} offset="0%" />
          <stop css={styles.faceStop1} offset="100%" />
        </linearGradient>
        <radialGradient id="dsi-spacing-sp-spot" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.42"
          />
          <stop
            offset="48%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.14"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g css={styles.scene}>
        <g css={styles.bloom}>
          <ellipse
            cx="228"
            cy="150"
            rx="140"
            ry="72"
            fill="url(#dsi-spacing-sp-glow)"
          />
        </g>

        <g css={styles.guides}>
          {BARS.map((bar) => (
            <line
              css={styles.guideLine}
              key={bar.label}
              x1={bar.x + bar.width / 2}
              y1={bar.labelY + 6}
              x2={bar.x + bar.width / 2}
              y2={BASELINE}
            />
          ))}
        </g>

        <g css={styles.bars}>
          <g css={styles.rise}>
            {BARS.map((bar) => (
              <rect
                key={bar.label}
                x={bar.x}
                y={BASELINE - bar.height}
                width={bar.width}
                height={bar.height}
                rx="4"
                fill="url(#dsi-spacing-sp-face)"
              />
            ))}
          </g>
        </g>

        <ellipse
          css={styles.spot}
          cx="180"
          cy="118"
          rx="104"
          ry="80"
          fill="url(#dsi-spacing-sp-spot)"
        />

        <g css={styles.labels}>
          {BARS.map((bar) => (
            <text
              css={styles.labelText}
              key={bar.label}
              x={bar.x + bar.width / 2}
              y={bar.labelY}
            >
              {bar.label}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // Card-specific bar-face gradient tokens (top/bottom), layered on illoBase.
  svg: {
    "--sp-face-top": "light-dark(#d6d5d1, #47463f)",
    "--sp-face-bot": "light-dark(#c4c3bd, #34332d)",
  },
  glowStop0: {
    stopColor: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    stopOpacity: 0.85,
    transition: "stop-color 520ms ease",
  },
  glowStop1: {
    stopColor: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    stopOpacity: 0.26,
    transition: "stop-color 520ms ease",
  },
  faceStop0: {
    stopColor: {
      default: "var(--sp-face-top)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--sp-face-top), var(--ds-illo-hue) 13%)",
    },
    transition: "stop-color 520ms ease",
  },
  faceStop1: {
    stopColor: {
      default: "var(--sp-face-bot)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--sp-face-bot), var(--ds-illo-hue) 7%)",
    },
    transition: "stop-color 520ms ease",
  },
  scene: {
    opacity: {
      default: 0.3,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    // Compact the whole scale toward the bottom-right corner so the tallest
    // bars clear the description copy and the art reads smaller.
    transformBox: "view-box",
    transformOrigin: "320px 176px",
    transform: "scale(0.72)",
    transition: "opacity 520ms ease",
  },
  bloom: {
    opacity: {
      default: 0.03,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.43,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 14px), calc(var(--ds-illo-my) * 11px)) scale(0.85)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "translate(calc(var(--ds-illo-mx) * 14px), calc(var(--ds-illo-my) * 11px)) scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 520ms ease, transform 440ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  rise: {
    transformBox: "fill-box",
    transformOrigin: "bottom",
    transform: {
      default: "scaleY(0.9)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "scaleY(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  bars: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 5px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  spot: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.6,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 44px), calc(var(--ds-illo-my) * 22px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 520ms ease, transform 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  guides: {
    opacity: {
      default: 0.28,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.6,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 2.5px), calc(var(--ds-illo-my) * 2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 520ms ease, transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  guideLine: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1,
    strokeLinecap: "round",
    strokeDasharray: "2 4.5",
    transition: "stroke 520ms ease",
  },
  labels: {
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.9,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 2.5px), calc(var(--ds-illo-my) * 2px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "opacity 520ms ease, transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  labelText: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "10.5px",
    fontWeight: 500,
    textAnchor: "middle",
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) 60%)",
    },
    transition: "fill 520ms ease",
  },
});
