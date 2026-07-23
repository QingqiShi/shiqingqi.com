import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Spacing foundation-card illustration. A rem-based spacing scale drawn as seven
 * rounded bars growing in height left -> right (0.25 -> 4). Each bar carries a
 * small value label on a gentle diagonal, joined to its bar by a faint dashed
 * leader; the row sits along the bottom edge and bleeds to the right. At rest the
 * bars are a dim neutral grey; on hover a warm-gold bloom rises behind them and
 * the labels and leaders warm.
 *
 * On hover the layers react to the pointer: the bar stack leans toward the
 * cursor, an ambient bloom behind it drifts a touch further, and a warm
 * highlight sweeps across the bar faces tracking where the pointer is.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The rest ->
 * alive bloom keys off the tile's own state with `stylex.when.ancestor(...)`
 * (the tile carries `illoMarker`), so each element transitions its own colour /
 * opacity between the two states — no shared signal variable. Continuous pointer
 * lean/parallax reads the inherited `--ds-illo-mx` / `--ds-illo-my` (centred at
 * rest, so the transforms sit at home until IlloLayer feeds a pointer position).
 * The base palette tokens come from `illoBase`, with two card-specific bar-face
 * tokens (`--sp-face-top` / `--sp-face-bot`) added on the root.
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
        {/* Warm bloom that rises behind the taller bars on hover. The inner
            stops crossfade neutral ink -> warm gold as the card wakes. */}
        <radialGradient id="dsi-spacing-sp-glow" cx="50%" cy="50%" r="50%">
          <stop css={styles.glowStop0} offset="0%" />
          <stop css={styles.glowStop1} offset="55%" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Bar face: a neutral dark panel that warms a touch on hover. */}
        <linearGradient id="dsi-spacing-sp-face" x1="0" y1="0" x2="0" y2="1">
          <stop css={styles.faceStop0} offset="0%" />
          <stop css={styles.faceStop1} offset="100%" />
        </linearGradient>
        {/* Warm highlight that tracks the cursor across the bar faces. */}
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
        {/* Bloom hugging the bottom-right where the tall bars stand. */}
        <g css={styles.bloom}>
          <ellipse
            cx="228"
            cy="150"
            rx="140"
            ry="72"
            fill="url(#dsi-spacing-sp-glow)"
          />
        </g>

        {/* Dashed leaders joining each bar to its value label. */}
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

        {/* The spacing scale: rounded bars growing in height left -> right.
            The outer group parallaxes toward the cursor; the inner group rises
            from the baseline on hover. */}
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

        {/* Warm highlight sweeping across the bar faces, tracking the cursor. */}
        <ellipse
          css={styles.spot}
          cx="180"
          cy="118"
          rx="104"
          ry="80"
          fill="url(#dsi-spacing-sp-spot)"
        />

        {/* Value labels on a gentle diagonal above the bars. */}
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
  // Card-specific bar-face tokens layered on top of illoBase's illo family.
  // Neutral dark panel faces for the bars (top/bottom of the sheen).
  svg: {
    "--sp-face-top": "light-dark(#d6d5d1, #47463f)",
    "--sp-face-bot": "light-dark(#c4c3bd, #34332d)",
  },
  // Bloom gradient stops: neutral ink at rest, crossfading to warm gold as the
  // card wakes. The tail stop (offset 100%) stays static in the markup.
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
  // Bar-face gradient stops: neutral dark panel that warms a touch on hover.
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
    transition: "opacity 520ms ease",
  },
  // Ambient warmth hugging the bars. No pulse loop — it drifts a touch with the
  // pointer so the field light reads as coming from the cursor.
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
  // Bars sit slightly compressed at rest and rise from the baseline on hover.
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
  // Foreground: the bar stack leans toward the cursor, parallaxing ahead of the
  // ambient bloom behind it and the guides/labels beneath. Settles to centre
  // (mx/my = 0) when the pointer leaves.
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
  // Cursor-tracking highlight: a warm radial that sweeps across the bar faces,
  // catching light where the pointer is. Larger travel than the bars so it reads
  // as a moving light source rather than part of the stack.
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
  // Guides + labels share a smaller parallax than the bars — a mid layer that
  // moves less, so the stack pulls away from them into depth on hover.
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
