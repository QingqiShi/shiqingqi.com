import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Typography foundation-card illustration: a metallic serif "Aa" over a
 * type-scale ruler (72 / 48 / 24 / 16), dim silver at rest and warming toward
 * the cursor on hover.
 */
export function TypographyIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-typography-ty-orb" cx="50%" cy="54%" r="58%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.8"
          />
          <stop offset="55%" stopColor="var(--ds-illo-hue)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="dsi-typography-ty-metal"
          x1="0"
          y1="0"
          x2="0.15"
          y2="1"
        >
          <stop
            offset="0%"
            style={{ stopColor: "light-dark(#8f8b82, #f1efe9)" }}
          />
          <stop
            offset="34%"
            style={{ stopColor: "light-dark(#6c6960, #cbc8bf)" }}
          />
          <stop
            offset="56%"
            style={{ stopColor: "light-dark(#9c7c46, #dcc59a)" }}
          />
          <stop
            offset="78%"
            style={{ stopColor: "light-dark(#5f5b52, #b3aea3)" }}
          />
          <stop
            offset="100%"
            style={{ stopColor: "light-dark(#403d37, #928e84)" }}
          />
        </linearGradient>
        <linearGradient
          id="dsi-typography-ty-sweep"
          x1="0"
          y1="0"
          x2="1"
          y2="0"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter
          id="dsi-typography-ty-blur"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <ellipse
        css={styles.orb}
        cx="258"
        cy="120"
        rx="86"
        ry="62"
        fill="url(#dsi-typography-ty-orb)"
      />

      <g>
        <g css={styles.rule}>
          <line css={styles.ruleLine} x1="188" y1="76" x2="318" y2="76" />
          <line css={styles.ruleLine} x1="188" y1="100" x2="318" y2="100" />
          <line css={styles.ruleLine} x1="188" y1="140" x2="318" y2="140" />
          <line css={styles.ruleLine} x1="188" y1="153" x2="318" y2="153" />
        </g>
        <g css={styles.nums}>
          <text css={styles.numsText} x="180" y="76">
            72
          </text>
          <text css={styles.numsText} x="180" y="100">
            48
          </text>
          <text css={styles.numsText} x="180" y="140">
            24
          </text>
          <text css={styles.numsText} x="180" y="153">
            16
          </text>
        </g>
      </g>

      <g css={styles.letters}>
        <text
          css={[styles.glyph, styles.glow]}
          x="194"
          y="156"
          filter="url(#dsi-typography-ty-blur)"
          fill="var(--ds-illo-hue-soft)"
        >
          Aa
        </text>
        <text css={[styles.glyph, styles.ink]} x="194" y="156" fill="#7f7d77">
          Aa
        </text>
        <text
          css={[styles.glyph, styles.metal]}
          x="194"
          y="156"
          fill="url(#dsi-typography-ty-metal)"
        >
          Aa
        </text>
      </g>

      <g css={styles.shimmerWrap}>
        <rect
          css={styles.shimmer}
          x="190"
          y="150"
          width="76"
          height="6"
          rx="3"
          fill="url(#dsi-typography-ty-sweep)"
        />
      </g>

      <g css={styles.caret}>
        <line css={styles.caretBlink} x1="315" y1="156" x2="315" y2="74" />
      </g>
    </svg>
  );
}

// Runs continuously but is invisible at rest (the caret group is opacity 0 until
// the tile is alive), so the blink only reads once the card is hovered.
const blink = stylex.keyframes({
  "0%, 60%": { opacity: 1 },
  "74%": { opacity: 0.1 },
  "86%": { opacity: 0.1 },
  "96%, 100%": { opacity: 1 },
});

const styles = stylex.create({
  glyph: {
    fontFamily: 'Georgia, "Times New Roman", "Songti SC", serif',
    fontSize: "120px",
    fontWeight: 500,
    letterSpacing: "-1px",
  },
  // Pointer lean; mx/my are 0 at rest, so this (and every --ds-illo-mx/my
  // transform below) sits home until IlloLayer feeds a pointer position.
  letters: {
    transformBox: "view-box",
    transformOrigin: "238px 120px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(var(--ds-illo-my) * 5px)) rotate(calc(var(--ds-illo-mx) * 1.4deg))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 280ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  glow: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.5,
    },
    transformBox: "view-box",
    transformOrigin: "250px 120px",
    transform: {
      default: "scale(0.92)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "scale(1.02)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms cubic-bezier(0.32, 0.72, 0, 1), transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ink: {
    opacity: {
      default: 0.62,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 480ms ease",
  },
  metal: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transition: "opacity 480ms cubic-bezier(0.32, 0.72, 0, 1)",
  },
  orb: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.5,
    },
    transformBox: "view-box",
    transformOrigin: "256px 118px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 26px), calc(var(--ds-illo-my) * 20px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 560ms cubic-bezier(0.32, 0.72, 0, 1), transform 420ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  rule: {
    opacity: {
      default: 0.26,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.6,
    },
    transition: "opacity 520ms ease",
  },
  ruleLine: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    strokeWidth: 1.2,
    strokeLinecap: "round",
    transition: "stroke 520ms ease",
  },
  nums: {
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.8,
    },
    transition: "opacity 520ms ease",
  },
  numsText: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    textAnchor: "end",
    dominantBaseline: "middle",
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    transition: "fill 520ms ease",
  },
  shimmerWrap: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.9,
    },
    transition: "opacity 520ms ease",
  },
  shimmer: {
    transform: {
      default: "translateX(calc(var(--ds-illo-mx) * 34px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 220ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  caret: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transition: "opacity 420ms ease",
  },
  caretBlink: {
    stroke: "var(--ds-illo-hue-soft)",
    strokeWidth: 2,
    strokeLinecap: "butt",
    animationName: { default: blink, [motionConstants.REDUCED_MOTION]: "none" },
    animationDuration: "2.3s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
});
