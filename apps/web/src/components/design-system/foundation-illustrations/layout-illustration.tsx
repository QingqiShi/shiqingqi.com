import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase } from "./illustration.stylex.ts";

/**
 * Layout foundation-card illustration. A breakpoint ruler (360 / 768 / 1024 /
 * 1440) tilts gently across the top with tick marks and an origin bracket. Below
 * it a block of eight vertical columns recedes in a subtle perspective (a shared
 * `skewY` keeps the verticals upright while the top edge rises to the right) and
 * bleeds off the bottom edge. A dashed 16:9 aspect box sits over the columns. At
 * rest everything is a dim metallic grey; on hover the keylines and labels bloom
 * warm gold, the column block drifts a touch toward the cursor, and a breakpoint
 * handle scrubs along the ruler tracking the pointer's horizontal position.
 *
 * Styling is StyleX, applied per SVG element via the `css` prop. The scene reads
 * the shared `--ds-illo` family (aliveness 0 -> 1, centred pointer
 * `--ds-illo-mx` / `--ds-illo-my`, ruler progress `--ds-illo-px`) that the tile
 * and IlloLayer publish; the base palette tokens come from `illoBase`.
 */
export function LayoutIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <g css={styles.art}>
        {/* Column grid — eight vertical strips inside a keyline frame, sharing a
            gentle skew so the top edge recedes to the right while the strips
            stay vertical. Bleeds off the bottom edge. */}
        <g css={styles.grid}>
          <g>
            {columnX.map((x, i) => (
              <rect
                key={x}
                css={[styles.col, i % 2 === 0 ? styles.colOdd : styles.colEven]}
                x={x}
                y="120"
                width="19"
                height="84"
              />
            ))}
          </g>

          {/* Block frame around the columns. */}
          <rect
            css={styles.frame}
            x="150"
            y="120"
            width="166"
            height="84"
            rx="2"
          />

          {/* Dashed 16:9 aspect box overlaid on the columns. */}
          <rect
            css={styles.ratio}
            x="196"
            y="146"
            width="96"
            height="62"
            rx="1"
          />
        </g>

        {/* Aspect-ratio label — drawn upright, outside the skewed grid. */}
        <text css={styles.ratioLabel} x="248" y="162">
          16:9
        </text>

        {/* Breakpoint ruler: tilted baseline, origin bracket, ticks + labels. */}
        <g>
          <line css={styles.rline} x1="148" y1="106" x2="322" y2="96" />

          {/* Origin bracket at the left end of the ruler. */}
          <line
            css={[styles.tick, styles.bracket]}
            x1="158"
            y1="100"
            x2="158"
            y2="113"
          />

          {/* Ticks hanging below the baseline at each breakpoint. */}
          <line css={styles.tick} x1="178" y1="102" x2="178" y2="112" />
          <line css={styles.tick} x1="228" y1="99" x2="228" y2="109" />
          <line css={styles.tick} x1="272" y1="96" x2="272" y2="107" />
          <line css={styles.tick} x1="312" y1="94" x2="312" y2="105" />

          {/* Breakpoint labels above their ticks. */}
          <text css={styles.rlabel} x="178" y="93">
            360
          </text>
          <text css={styles.rlabel} x="228" y="90">
            768
          </text>
          <text css={styles.rlabel} x="272" y="88">
            1024
          </text>
          <text css={styles.rlabel} x="305" y="86">
            1440
          </text>

          {/* Handle tracking the cursor's horizontal position along the ruler. */}
          <circle css={styles.handle} cx="162" cy="105" r="2.6" />
        </g>
      </g>
    </svg>
  );
}

// The eight columns in source order; odd source positions (1, 3, 5, 7) render as
// the brighter fill, even positions (2, 4, 6, 8) as the dimmer one.
const columnX = [150, 171, 192, 213, 234, 255, 276, 297];

const styles = stylex.create({
  art: {
    opacity: "calc(0.24 + 0.76 * var(--ds-illo))",
    transition: "opacity 560ms ease",
  },
  // Column grid — shared perspective skew keeps verticals upright, drifting
  // subtly toward the cursor so the block reads as a plane behind the ruler.
  // Settles to centre (mx/my = 0) when the pointer leaves.
  grid: {
    transformBox: "view-box",
    transformOrigin: "234px 120px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(var(--ds-illo-my) * 5px)) skewY(-4deg)",
      // No pointer lean under reduced motion: hold the skew, drop the drift.
      [motionConstants.REDUCED_MOTION]: "skewY(-4deg)",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  col: {
    fill: "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 15%))",
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))",
    strokeWidth: 0.75,
    strokeOpacity: "calc(0.32 + 0.28 * var(--ds-illo))",
    transition: "fill 500ms ease, stroke 500ms ease",
  },
  colOdd: {
    fillOpacity: 0.16,
  },
  colEven: {
    fillOpacity: 0.07,
  },
  frame: {
    fill: "none",
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))",
    strokeWidth: 1.2,
    opacity: "calc(0.4 + 0.35 * var(--ds-illo))",
    transition: "stroke 500ms ease, opacity 500ms ease",
  },
  ratio: {
    fill: "none",
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    strokeWidth: 1.2,
    strokeDasharray: "6 5",
    strokeLinecap: "butt",
    opacity: "calc(0.5 + 0.4 * var(--ds-illo))",
    // An extra sliver of drift on top of the grid so the aspect box floats a
    // layer above the columns behind it.
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 3px), calc(var(--ds-illo-my) * 2.5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "stroke 500ms ease, opacity 500ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  ratioLabel: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    textAnchor: "middle",
    dominantBaseline: "middle",
    fill: "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    opacity: "calc(0.55 + 0.4 * var(--ds-illo))",
    // Track the aspect box's total drift (grid + own) so the label stays glued.
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 9px), calc(var(--ds-illo-my) * 7.5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "fill 500ms ease, opacity 500ms ease, transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Breakpoint ruler.
  rline: {
    fill: "none",
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))",
    strokeWidth: 1.2,
    strokeLinecap: "round",
    opacity: 0.85,
    transition: "stroke 500ms ease",
  },
  tick: {
    stroke:
      "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))",
    strokeWidth: 1.3,
    strokeLinecap: "round",
    transition: "stroke 500ms ease",
  },
  bracket: {
    strokeWidth: 1.5,
  },
  rlabel: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    textAnchor: "middle",
    fill: "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) calc(var(--ds-illo) * 100%))",
    opacity: "calc(0.55 + 0.4 * var(--ds-illo))",
    transition: "fill 500ms ease, opacity 500ms ease",
  },
  // The handle scrubs along the ruler with the cursor's horizontal position:
  // px = 0 parks it at the ruler's start, px = 1 carries it to the far
  // breakpoint. The multipliers trace the ruler's leftward rise (174px of run
  // drops ~10px), so the handle stays on the baseline across its full length.
  handle: {
    fill: "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue-soft) calc(var(--ds-illo) * 100%))",
    opacity: "calc(0.85 * var(--ds-illo))",
    transformBox: "view-box",
    // Park the handle mid-ruler (px treated as 0.5) under reduced motion.
    transform: {
      default:
        "translate(calc(var(--ds-illo-px) * 150px), calc(var(--ds-illo-px) * -8.6px))",
      [motionConstants.REDUCED_MOTION]: "translate(75px, -4.3px)",
    },
    transition: {
      default: "transform 220ms var(--ds-illo-ease), opacity 500ms ease",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
