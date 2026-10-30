import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import {
  motionConstants,
  duration,
  easing,
} from "@tuja/ui/primitives/motion.stylex";
import { color } from "@tuja/ui/tokens.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase, illoVars } from "./illustration.stylex.ts";
import { squirclePath } from "./squircle-path.ts";

const OUTER_RADIUS = 30;
const INSET = 14;
const INNER_RADIUS = OUTER_RADIUS - INSET;

const CARD = squirclePath(164, 58, 196, 150, OUTER_RADIUS);
const PANEL = squirclePath(
  164 + INSET,
  58 + INSET,
  196 - INSET * 2,
  150 - INSET * 2,
  INNER_RADIUS,
);

/** The centre both top-left corners share, because inner = outer − inset. */
const CORNER_CX = 164 + OUTER_RADIUS;
const CORNER_CY = 58 + OUTER_RADIUS;
const DIAGONAL = Math.SQRT1_2;

/**
 * Surfaces foundation-card illustration: a card drawn with a border, a panel
 * inside it drawn with a background, and a pill floating over both. Engaging
 * the card warms the edges to gold, shows that the two corners share one
 * centre, and lifts the pill — with a crisp edge and no shadow.
 */
export function SurfacesIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-surfaces-hue" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={illoVars.hueSoft} stopOpacity="0.72" />
          <stop offset="45%" stopColor={illoVars.hue} stopOpacity="0.3" />
          <stop offset="100%" stopColor={illoVars.hue} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-surfaces-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={illoVars.ink} stopOpacity="0.4" />
          <stop offset="100%" stopColor={illoVars.ink} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        css={styles.inkGlow}
        cx="290"
        cy="150"
        r="96"
        fill="url(#dsi-surfaces-ink)"
      />
      <circle
        css={styles.bloom}
        cx="286"
        cy="140"
        r="108"
        fill="url(#dsi-surfaces-hue)"
      />

      <g css={styles.card}>
        <path css={styles.cardEdge} d={CARD} />
        <g css={styles.panelGroup}>
          <path css={styles.panel} d={PANEL} />
          <rect css={styles.row} x="196" y="92" width="92" height="6" rx="3" />
          <rect css={styles.row} x="196" y="106" width="58" height="6" rx="3" />
        </g>

        <g css={styles.radiusGuide}>
          <line
            x1={CORNER_CX}
            y1={CORNER_CY}
            x2={CORNER_CX - OUTER_RADIUS * DIAGONAL}
            y2={CORNER_CY - OUTER_RADIUS * DIAGONAL}
            strokeDasharray="2 3"
          />
          <circle cx={CORNER_CX} cy={CORNER_CY} r="2" />
          <circle
            cx={CORNER_CX - INNER_RADIUS * DIAGONAL}
            cy={CORNER_CY - INNER_RADIUS * DIAGONAL}
            r="1.6"
          />
        </g>
      </g>

      <g css={styles.float}>
        <rect
          css={styles.pill}
          x="214"
          y="128"
          width="118"
          height="32"
          rx="16"
        />
        <circle css={styles.pillMark} cx="232" cy="144" r="6" />
        <rect
          css={styles.pillLabel}
          x="246"
          y="141"
          width="60"
          height="6"
          rx="3"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  inkGlow: {
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.45,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.45,
      },
    },
    transformBox: "view-box",
    transformOrigin: "286px 140px",
    transform: {
      default: `translate(calc(${illoVars.mx} * 22px), calc(${illoVars.my} * 16px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `opacity ${duration._500} ${easing.ease}, transform ${duration._800} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  card: {
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 3px), calc(${illoVars.my} * 2.4px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  cardEdge: {
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
    strokeWidth: 1.4,
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.9,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.9,
      },
    },
    transition: `stroke ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  panelGroup: {
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 2px), calc(${illoVars.my} * 1.6px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  panel: {
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
      default: 0.12,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.18,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.18,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  row: {
    fill: illoVars.ink,
    opacity: {
      default: 0.3,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.45,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.45,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  radiusGuide: {
    fill: illoVars.hue,
    stroke: illoVars.hue,
    strokeWidth: 1.2,
    strokeLinecap: "round",
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.95,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.95,
      },
    },
    transition: `opacity ${duration._400} ${easing.ease} ${duration._150}`,
  },
  float: {
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 9px), calc(${illoVars.my} * 7px))`,
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        `translate(calc(${illoVars.mx} * 9px), calc(${illoVars.my} * 7px - 7px))`,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          `translate(calc(${illoVars.mx} * 9px), calc(${illoVars.my} * 7px - 7px))`,
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
    transition: {
      default: `transform ${duration._1000} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Opaque, so the pill hides what it floats over; the edge, not a shadow,
  // separates it.
  pill: {
    fill: color.bgSurface,
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
    strokeWidth: 1.4,
    strokeOpacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `stroke ${duration._500} ${easing.ease}, stroke-opacity ${duration._500} ${easing.ease}`,
  },
  pillMark: {
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
      default: 0.5,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  pillLabel: {
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
      default: 0.4,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.9,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.9,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
});
