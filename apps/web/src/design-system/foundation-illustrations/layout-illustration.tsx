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
 * Layout foundation-card illustration: a tilted breakpoint ruler (320 / 768 /
 * 1080 / 2000) with a scrubbing handle over a perspective block of eight columns
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
      <g css={styles.illustration}>
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
            320
          </text>
          <text css={styles.rlabel} x="228" y="90">
            768
          </text>
          <text css={styles.rlabel} x="272" y="88">
            1080
          </text>
          <text css={styles.rlabel} x="305" y="86">
            2000
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
  illustration: {
    opacity: {
      default: 0.24,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  // Shared skewY keeps the column verticals upright while the top edge recedes,
  // reading as a plane behind the ruler.
  grid: {
    transformBox: "view-box",
    transformOrigin: "234px 120px",
    transform: {
      default: `translate(calc(${illoVars.mx} * 6px), calc(${illoVars.my} * 5px)) skewY(-4deg)`,
      [motionConstants.REDUCED_MOTION]: "skewY(-4deg)",
    },
    transition: {
      default: `transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  col: {
    fill: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        `color-mix(in oklab, ${illoVars.ink}, ${illoVars.hue} 15%)`,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          `color-mix(in oklab, ${illoVars.ink}, ${illoVars.hue} 15%)`,
      },
    },
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    strokeWidth: 0.75,
    strokeOpacity: {
      default: 0.32,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.6,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.6,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, stroke ${duration._500} ${easing.ease}, stroke-opacity ${duration._500} ${easing.ease}`,
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
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    strokeWidth: 1.2,
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.75,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.75,
      },
    },
    transition: `stroke ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  ratio: {
    fill: "none",
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hueSoft,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hueSoft,
      },
    },
    strokeWidth: 1.2,
    strokeDasharray: "6 5",
    strokeLinecap: "butt",
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.9,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.9,
      },
    },
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 3px), calc(${illoVars.my} * 2.5px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `stroke ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}, transform ${duration._500} ${easing.spring}`,
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
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hueSoft,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hueSoft,
      },
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.95,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.95,
      },
    },
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 9px), calc(${illoVars.my} * 7.5px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}, transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  rline: {
    fill: "none",
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    strokeWidth: 1.2,
    strokeLinecap: "round",
    opacity: 0.85,
    transition: `stroke ${duration._500} ${easing.ease}`,
  },
  tick: {
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    strokeWidth: 1.3,
    strokeLinecap: "round",
    transition: `stroke ${duration._500} ${easing.ease}`,
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
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    opacity: {
      default: 0.55,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.95,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.95,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  handle: {
    fill: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hueSoft,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hueSoft,
      },
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.85,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.85,
      },
    },
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.px} * 150px), calc(${illoVars.px} * -8.6px))`,
      [motionConstants.REDUCED_MOTION]: "translate(75px, -4.3px)",
    },
    transition: {
      default: `transform ${duration._400} ${easing.spring}, fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
