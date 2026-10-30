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
 * Accessibility foundation-card illustration: a control taking focus, then being
 * announced. Engaging the card strokes the ring round the perimeter and fans out
 * three arcs from the control's trailing edge.
 */

// `a11y.focusRing`'s 2px-at-2px-offset ratio, held at this scale. Kept clear of
// the trailing edge so the widest arc (50) has stage to expand into.
const BOX_X = 158;
const BOX_Y = 92;
const BOX_W = 104;
const BOX_H = 44;
const BOX_R = 22;
const RING_OFFSET = 5;

// `Math.PI` fails the build: the StyleX compiler evaluates every constant a
// `stylex.create` block reaches, and cannot resolve a member expression.
const PI = 3.14159265;

// A rounded rect's perimeter: its straight runs plus one full circle of corners.
const RING_INLINE = BOX_W + RING_OFFSET * 2;
const RING_BLOCK = BOX_H + RING_OFFSET * 2;
const RING_RADIUS = BOX_R + RING_OFFSET;
const RING_PATH_LENGTH =
  2 * (RING_INLINE - 2 * RING_RADIUS) +
  2 * (RING_BLOCK - 2 * RING_RADIUS) +
  2 * PI * RING_RADIUS;

// Announcement arcs, fanning out from the control's trailing edge. Each is a
// quarter-turn of a circle centred on that edge, so the three read as one wave
// front expanding rather than three unrelated curves.
const ARC_ORIGIN_X = BOX_X + BOX_W;
const ARC_ORIGIN_Y = BOX_Y + BOX_H / 2;

// A quarter turn centred on the horizontal.
function arcPath(radius: number) {
  const half = radius * Math.SQRT1_2;
  return [
    `M ${(ARC_ORIGIN_X + half).toFixed(2)} ${(ARC_ORIGIN_Y - half).toFixed(2)}`,
    `A ${radius.toString()} ${radius.toString()} 0 0 1`,
    `${(ARC_ORIGIN_X + half).toFixed(2)} ${(ARC_ORIGIN_Y + half).toFixed(2)}`,
  ].join(" ");
}

export function AccessibilityIllustration() {
  return (
    <svg
      css={illoBase.svg}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="dsi-a11y-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={illoVars.hueSoft} stopOpacity="0.7" />
          <stop offset="45%" stopColor={illoVars.hue} stopOpacity="0.28" />
          <stop offset="100%" stopColor={illoVars.hue} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        css={styles.bloom}
        cx="224"
        cy="126"
        r="104"
        fill="url(#dsi-a11y-glow)"
      />

      <g css={styles.scene}>
        {/* Under the control, so the wave reads as leaving it. */}
        <g css={styles.waves}>
          {ARCS.map((arc) => (
            <path
              key={arc.radius}
              css={[styles.wave, arc.stagger]}
              d={arcPath(arc.radius)}
              strokeWidth={arc.width}
            />
          ))}
        </g>

        {/* The control: a plate, a keyline, and a rule standing in for its name. */}
        <rect
          css={styles.plate}
          x={BOX_X}
          y={BOX_Y}
          width={BOX_W}
          height={BOX_H}
          rx={BOX_R}
        />
        <rect
          css={styles.plateKeyline}
          x={BOX_X}
          y={BOX_Y}
          width={BOX_W}
          height={BOX_H}
          rx={BOX_R}
          fill="none"
        />
        <line
          css={styles.label}
          x1={BOX_X + 22}
          y1={ARC_ORIGIN_Y}
          x2={BOX_X + BOX_W - 22}
          y2={ARC_ORIGIN_Y}
        />

        {/* Two rings: where it will land, and the one that draws itself on. */}
        <rect
          css={styles.ringRest}
          x={BOX_X - RING_OFFSET}
          y={BOX_Y - RING_OFFSET}
          width={RING_INLINE}
          height={RING_BLOCK}
          rx={RING_RADIUS}
          fill="none"
        />
        <rect
          css={styles.ringDraw}
          x={BOX_X - RING_OFFSET}
          y={BOX_Y - RING_OFFSET}
          width={RING_INLINE}
          height={RING_BLOCK}
          rx={RING_RADIUS}
          fill="none"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.6,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.6,
      },
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.84)",
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "scale(1)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "scale(1)",
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
    transition: {
      default: `opacity ${duration._500} ${easing.ease}, transform ${duration._1000} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Leans as one: parallax would slide the ring off the control it belongs to.
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
  plate: {
    fill: illoVars.ink,
    opacity: {
      default: 0.14,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.2,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.2,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  plateKeyline: {
    stroke: illoVars.ink,
    strokeWidth: 1.2,
    opacity: {
      default: 0.42,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.6,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.6,
      },
    },
    transition: `opacity ${duration._500} ${easing.ease}`,
  },
  // Present at rest: an unfocused control still has a name.
  label: {
    stroke: {
      default: illoVars.ink,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        illoVars.hueSoft,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: illoVars.hueSoft,
      },
    },
    strokeWidth: 4,
    strokeLinecap: "round",
    opacity: {
      default: 0.34,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.7,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.7,
      },
    },
    transition: `stroke ${duration._500} ${easing.ease}, opacity ${duration._500} ${easing.ease}`,
  },
  // At the offset the gold ring lands at, and fades as it draws in.
  ringRest: {
    stroke: illoVars.ink,
    strokeWidth: 1,
    strokeDasharray: "2 6",
    opacity: {
      default: 0.28,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
      },
    },
    transition: `opacity ${duration._200} ${easing.ease}`,
  },
  // Linear, so it reads as a pen at constant speed. Under reduced motion the
  // offset is 0 in both states and the ring fades in already drawn.
  ringDraw: {
    stroke: illoVars.hue,
    strokeWidth: 2.5,
    strokeDasharray: RING_PATH_LENGTH,
    strokeDashoffset: {
      default: RING_PATH_LENGTH,
      [motionConstants.REDUCED_MOTION]: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0,
        [motionConstants.REDUCED_MOTION]: 0,
      },
    },
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.95,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.95,
      },
    },
    transition: {
      default: `stroke-dashoffset ${duration._500} ${easing.linear}, opacity ${duration._200} ${easing.ease}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._400} ${easing.ease}`,
    },
  },
  waves: {
    fill: "none",
    stroke: illoVars.hueSoft,
    strokeLinecap: "round",
  },
  // Scaled about the control's edge, so each arc grows out of it. Every arc is
  // the same quarter turn, so its shared centre lands at `-241.42% 50%` of its
  // own bounding box whatever the radius — one declaration covers all three.
  wave: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 0.75,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 0.75,
      },
    },
    transformBox: "fill-box",
    transformOrigin: "-241.42% 50%",
    transform: {
      default: "scale(0.62)",
      [motionConstants.REDUCED_MOTION]: "none",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "scale(1)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: "scale(1)",
        [motionConstants.REDUCED_MOTION]: "none",
      },
    },
    transition: {
      default: `opacity ${duration._300} ${easing.ease}, transform ${duration._700} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._300} ${easing.ease}`,
    },
  },
  // Per state, so the fan-out staggers and the exit is immediate. Delays clear
  // the ring's 500ms draw: focus lands, then the announcement.
  waveStagger1: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        duration._500,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: duration._500,
      },
    },
  },
  waveStagger2: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        duration._700,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: duration._700,
      },
    },
  },
  waveStagger3: {
    transitionDelay: {
      default: "0ms",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        duration._800,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: duration._800,
      },
    },
  },
});

// Near to far, thinning as they travel. Declared below `styles` so it can
// reference the stagger rules.
const ARCS = [
  { radius: 22, width: 3, stagger: styles.waveStagger1 },
  { radius: 36, width: 2.4, stagger: styles.waveStagger2 },
  { radius: 50, width: 1.8, stagger: styles.waveStagger3 },
];
