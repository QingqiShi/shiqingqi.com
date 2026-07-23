import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Layout foundation-card illustration: a tilted breakpoint ruler (360 / 768 /
 * 1024 / 1440) with a scrubbing handle over a perspective block of eight columns
 * and a dashed 16:9 box, dim metallic grey at rest and warming to gold on hover.
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

          <rect
            css={styles.frame}
            x="150"
            y="120"
            width="166"
            height="84"
            rx="2"
          />

          <rect
            css={styles.ratio}
            x="196"
            y="146"
            width="96"
            height="62"
            rx="1"
          />
        </g>

        <text css={styles.ratioLabel} x="248" y="162">
          16:9
        </text>

        <g>
          <line css={styles.rline} x1="148" y1="106" x2="322" y2="96" />

          <line
            css={[styles.tick, styles.bracket]}
            x1="158"
            y1="100"
            x2="158"
            y2="113"
          />

          <line css={styles.tick} x1="178" y1="102" x2="178" y2="112" />
          <line css={styles.tick} x1="228" y1="99" x2="228" y2="109" />
          <line css={styles.tick} x1="272" y1="96" x2="272" y2="107" />
          <line css={styles.tick} x1="312" y1="94" x2="312" y2="105" />

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
    opacity: {
      default: 0.24,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transition: "opacity 560ms ease",
  },
  // Shared skewY keeps the column verticals upright while the top edge recedes,
  // reading as a plane behind the ruler.
  grid: {
    transformBox: "view-box",
    transformOrigin: "234px 120px",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(var(--ds-illo-my) * 5px)) skewY(-4deg)",
      [motionConstants.REDUCED_MOTION]: "skewY(-4deg)",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  col: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--ds-illo-ink), var(--ds-illo-hue) 15%)",
    },
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 0.75,
    strokeOpacity: {
      default: 0.32,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.6,
    },
    transition: "fill 500ms ease, stroke 500ms ease, stroke-opacity 500ms ease",
  },
  colOdd: {
    fillOpacity: 0.16,
  },
  colEven: {
    fillOpacity: 0.07,
  },
  frame: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1.2,
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.75,
    },
    transition: "stroke 500ms ease, opacity 500ms ease",
  },
  ratio: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    strokeWidth: 1.2,
    strokeDasharray: "6 5",
    strokeLinecap: "butt",
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.9,
    },
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
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
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
  rline: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1.2,
    strokeLinecap: "round",
    opacity: 0.85,
    transition: "stroke 500ms ease",
  },
  tick: {
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
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
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transition: "fill 500ms ease, opacity 500ms ease",
  },
  handle: {
    fill: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue-soft)",
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.85,
    },
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-px, 0.5) * 150px), calc(var(--ds-illo-px, 0.5) * -8.6px))",
      [motionConstants.REDUCED_MOTION]: "translate(75px, -4.3px)",
    },
    transition: {
      default:
        "transform 220ms var(--ds-illo-ease), fill 500ms ease, opacity 500ms ease",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
