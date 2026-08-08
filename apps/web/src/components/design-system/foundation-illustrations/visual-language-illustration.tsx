import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "../overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

const BACK = { x: 140, y: 36, width: 160, height: 124, rx: 30 };
const FRONT = { x: 182, y: 74, width: 138, height: 96, rx: 18 };
const DOTS = [
  { cx: 198, cy: 152 },
  { cx: 212, cy: 152 },
  { cx: 226, cy: 152 },
  { cx: 240, cy: 152 },
];

/**
 * Visual-language foundation-card illustration: two nested rounded surfaces —
 * the back one border-only, the front one filled — with a wash glow behind and
 * a row of texture dots at their corner. On hover the front surface separates
 * from the back, the corner pinch and the wash both become visible, and the
 * ink tone warms to gold.
 */
export function VisualLanguageIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-visual-language-wash" cx="50%" cy="50%" r="55%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.7"
          />
          <stop
            offset="50%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.24"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g css={styles.shrink}>
        <ellipse
          css={styles.wash}
          cx="234"
          cy="112"
          rx="120"
          ry="88"
          fill="url(#dsi-visual-language-wash)"
        />

        <g css={styles.dots}>
          {DOTS.map((dot) => (
            <circle
              key={`${dot.cx.toString()}-${dot.cy.toString()}`}
              cx={dot.cx}
              cy={dot.cy}
              r="2"
              fill="var(--ds-illo-ink)"
            />
          ))}
        </g>

        <rect
          css={styles.back}
          x={BACK.x}
          y={BACK.y}
          width={BACK.width}
          height={BACK.height}
          rx={BACK.rx}
          fill="none"
          strokeWidth="1.6"
        />

        <rect
          css={styles.front}
          x={FRONT.x}
          y={FRONT.y}
          width={FRONT.width}
          height={FRONT.height}
          rx={FRONT.rx}
          strokeWidth="1.6"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // Pulls the whole pair towards the bottom-right corner, matching the other
  // illustrations' scale-down, so it reads smaller beside the card copy.
  shrink: {
    transformBox: "view-box",
    transformOrigin: "320px 176px",
    transform: "scale(0.86)",
  },
  wash: {
    opacity: {
      default: 0.05,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.55,
    },
    transformBox: "view-box",
    transformOrigin: "234px 112px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 20px), calc(var(--ds-illo-my) * 15px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 550ms cubic-bezier(0.32, 0.72, 0, 1), transform 440ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 550ms ease",
    },
  },
  dots: {
    opacity: {
      default: 0.3,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.65,
    },
    transition: "opacity 480ms ease",
  },
  back: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.85,
    },
    transition: "stroke 480ms ease, opacity 480ms ease",
  },
  // Separates from the back surface on hover, so the corner relationship the
  // showcase teaches — inner = outer − inset — reads as motion rather than a
  // static overlap.
  front: {
    fill: {
      default: "color-mix(in oklab, var(--ds-illo-ink) 16%, transparent)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "color-mix(in oklab, var(--ds-illo-hue) 22%, transparent)",
    },
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "translate(0, 0)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "translate(10px, 8px)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "fill 480ms ease, stroke 480ms ease, transform 420ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "fill 480ms ease, stroke 480ms ease",
    },
  },
});
