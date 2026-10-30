import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import {
  motionConstants,
  duration,
  easing,
} from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoBase, illoVars } from "./illustration.stylex.ts";

const CX = 248;
const CY = 112;
const RING_R = 50;
const NEEDLE_R = 34;
const NEEDLE_HALF_W = 6;

/** One tick every 30°, the four cardinal ones longer. */
const TICKS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6;
  const inner = RING_R - (index % 3 === 0 ? 9 : 5);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    key: index,
    cardinal: index % 3 === 0,
    x1: (CX + inner * sin).toFixed(2),
    y1: (CY - inner * cos).toFixed(2),
    x2: (CX + (RING_R - 2) * sin).toFixed(2),
    y2: (CY - (RING_R - 2) * cos).toFixed(2),
  };
});

function needleHalf(tipY: number) {
  return [
    [CX, tipY],
    [CX + NEEDLE_HALF_W, CY],
    [CX - NEEDLE_HALF_W, CY],
  ]
    .map((point) => point.join(","))
    .join(" ");
}

const NORTH_HALF = needleHalf(CY - NEEDLE_R);
const SOUTH_HALF = needleHalf(CY + NEEDLE_R);
const CENTER = `${String(CX)}px ${String(CY)}px`;

/**
 * Principles foundation-card illustration: a compass, the thing you check when
 * the map runs out. At rest the needle sits a little off north; engaging the
 * card springs it home and lights the north half and the mark above the ring.
 */
export function PrinciplesIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-principles-orb" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={illoVars.hueSoft} stopOpacity="0.75" />
          <stop offset="55%" stopColor={illoVars.hue} stopOpacity="0.18" />
          <stop offset="100%" stopColor={illoVars.hue} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        css={styles.orb}
        cx={CX}
        cy={CY}
        rx="84"
        ry="70"
        fill="url(#dsi-principles-orb)"
      />

      <g css={styles.scene}>
        <circle css={styles.face} cx={CX} cy={CY} r={RING_R} />
        <circle css={styles.ring} cx={CX} cy={CY} r={RING_R} fill="none" />
        {TICKS.map((tick) => (
          <line
            key={tick.key}
            css={[styles.tick, tick.cardinal && styles.cardinal]}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
          />
        ))}
        <circle
          css={[styles.litFill, styles.north]}
          cx={CX}
          cy={CY - RING_R - 9}
          r="2.5"
        />

        <g css={styles.needle}>
          <polygon
            css={[styles.litFill, styles.northHalf]}
            points={NORTH_HALF}
          />
          <polygon css={styles.southHalf} points={SOUTH_HALF} />
        </g>
        <circle css={styles.hub} cx={CX} cy={CY} r="3" />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  orb: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.45,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.45,
      },
    },
    transformBox: "view-box",
    transformOrigin: CENTER,
    transform: {
      default: `translate(calc(${illoVars.mx} * 20px), calc(${illoVars.my} * 14px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `opacity ${duration._500} ${easing.ease}, transform ${duration._700} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._500} ${easing.ease}`,
    },
  },
  scene: {
    transformBox: "view-box",
    transform: {
      default: `translate(calc(${illoVars.mx} * 5px), calc(${illoVars.my} * 4px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: `transform ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  face: {
    fill: illoVars.ink,
    opacity: {
      default: 0.06,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.1,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  ring: {
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
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.8,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.8,
      },
    },
    transition: `stroke ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  tick: {
    stroke: illoVars.ink,
    strokeWidth: 1,
    strokeLinecap: "round",
    opacity: 0.3,
  },
  cardinal: {
    strokeWidth: 1.6,
    opacity: 0.5,
  },
  litFill: {
    fill: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hue,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hue,
      },
    },
  },
  north: {
    opacity: {
      default: 0.4,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  needle: {
    transformBox: "view-box",
    transformOrigin: CENTER,
    transform: {
      default: "rotate(-34deg)",
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "rotate(0deg)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "rotate(0deg)",
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
    transition: {
      default: `transform ${duration._1000} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  northHalf: {
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transition: `fill ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  southHalf: {
    fill: illoVars.ink,
    opacity: 0.28,
  },
  hub: {
    fill: illoVars.ink,
    opacity: 0.7,
  },
});
