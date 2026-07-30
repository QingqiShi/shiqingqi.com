import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { tileMarker } from "../overview-tile.stylex.ts";
import { illoBase } from "./illustration.stylex.ts";

/**
 * Elevation foundation-card illustration: a stack of three isometric sheets
 * floating above a flat grid "surface" the same size as the sheets, drawn in the
 * same flat, line-forward language as its siblings. Each sheet is a quiet grey
 * face with a thin keyline and a thickness sliver, with a soft shadow hugging its
 * underside. At rest the stack is tight with equal gaps; the pointer's height then
 * drives the elevation (via --ds-illo-py, 0 at the top → 1 at the bottom, so
 * `--el-lift = 1 - py`): raising the cursor fans the sheets apart in a graduated
 * scale — the grid→low gap opens least, low→mid more, mid→high most — while the
 * whole stack lifts off the grid. On hover the keylines and grid warm grey -> gold
 * and a gold bloom rises behind the stack.
 *
 * The grid is a flat square lattice projected to isometric and baked into
 * screen-space paths (GRID_LINES); the sheet faces are plain rounded rects tilted
 * by `scaleY(0.46) rotate(45deg)` (rotate rightmost so it applies first, then the
 * squish), kept as a single --el-tilt token so the co-registered faces never drift.
 */
const GRID_CELLS = 6; // grid squares per axis
const GRID_CX = 233; // screen centre of the surface
const GRID_CY = 134;
// Half-extents matched to the sheet's ACTUAL isometric footprint — its rounded
// corners pull the tilted 110px square in from the sharp-diamond tips (~78/36) to
// ~68/32, so the grid lands the same visual size as the sheets, not larger.
const GRID_AX = 34;
const GRID_AY = 16;

// Project a point (u, v) on the flat surface (each -1..1) to isometric screen space.
function projectSurface(u: number, v: number) {
  const x = GRID_CX + (u - v) * GRID_AX;
  const y = GRID_CY + (u + v) * GRID_AY;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

// A flat isometric lattice: one straight line per division in each direction —
// constant-v lines run across, constant-u lines run into depth.
const GRID_LINES = Array.from(
  { length: GRID_CELLS + 1 },
  (_, i) => (i / GRID_CELLS) * 2 - 1,
).flatMap((c) => [
  `M${projectSurface(-1, c)}L${projectSurface(1, c)}`,
  `M${projectSurface(c, -1)}L${projectSurface(c, 1)}`,
]);

// Shared geometry for the co-registered sheet faces (thickness, top, keyline) and
// the soft shadow that hugs each sheet's underside — single sources of truth so
// resizing never leaves the faces or the shadow out of registration.
const SHEET_RECT = { x: 178, y: 50, width: 110, height: 110, rx: 21 };
const SHADOW_ELLIPSE = { cx: 233, cy: 122, rx: 58, ry: 13 };

// The resting framing, named because it is declared twice — once as the framing
// and once as the reduced-motion pin that holds it there. The two have to move
// together, and a compound transform drifts silently: nothing renders both, so a
// mismatch shows up only as reduced-motion users seeing a framing nobody chose.
const RESTING_FRAME = "translate(34px, 40px) scale(1.3)";

export function ElevationIllustration() {
  // Bottom -> top. Painted in order so each higher sheet (and its shadow) lands
  // over the one below it.
  const sheets = [
    { key: "low", style: styles.sheetLow },
    { key: "mid", style: styles.sheetMid },
    { key: "high", style: styles.sheetHigh },
  ];

  return (
    <svg
      css={[illoBase.svg, styles.svg]}
      viewBox="0 0 320 176"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dsi-elevation-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" css={styles.topStop0} />
          <stop offset="100%" css={styles.topStop1} />
        </linearGradient>
        <radialGradient id="dsi-elevation-drop" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.55" />
          <stop
            offset="68%"
            stopColor="var(--ds-illo-ink)"
            stopOpacity="0.12"
          />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-elevation-bloom" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.7"
          />
          <stop
            offset="50%"
            stopColor="var(--ds-illo-hue)"
            stopOpacity="0.25"
          />
          <stop offset="100%" stopColor="var(--ds-illo-hue)" stopOpacity="0" />
        </radialGradient>
        {/* Soft vignette so the grid dissolves at its rim instead of ending on a
            hard diamond edge. */}
        <radialGradient id="dsi-elevation-grid-fade" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="58%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="dsi-elevation-grid-mask" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#dsi-elevation-grid-fade)" />
        </mask>
      </defs>

      <g css={styles.illustration}>
        {/* The surface the stack sits on: a flat isometric grid, same size as a
            sheet. The pointer never touches it — only the sheets above it react.
            It does travel with the framing, though, since it sits inside the same
            group: engaging the tile pans and rescales the grid along with the
            stack, and the sheets rise relative to it rather than over a fixed
            plane. */}
        <g css={styles.grid} mask="url(#dsi-elevation-grid-mask)">
          {/* All lines share one style, so they render as a single multi-subpath. */}
          <path d={GRID_LINES.join("")} />
        </g>

        {/* Gold bloom that rises behind the stack on hover — the family's "alive" glow. */}
        <circle
          css={styles.bloom}
          cx="233"
          cy="88"
          r="74"
          fill="url(#dsi-elevation-bloom)"
        />

        {/* Three stacked sheets: quiet grey face + thickness sliver + keyline, each
            with a soft shadow hugging its underside. Lift and spread with the pointer. */}
        {sheets.map(({ key, style }) => (
          <g key={key} css={style}>
            <ellipse
              css={styles.dropShadow}
              {...SHADOW_ELLIPSE}
              fill="url(#dsi-elevation-drop)"
            />
            <rect css={[styles.face, styles.side]} {...SHEET_RECT} />
            <rect
              css={styles.face}
              {...SHEET_RECT}
              fill="url(#dsi-elevation-top)"
            />
            <rect css={[styles.face, styles.keyline]} {...SHEET_RECT} />
          </g>
        ))}
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // Quiet grey face tokens, matched to the spacing bars so the sheets sit at the
  // same brightness as the rest of the set; warm slightly toward gold on hover.
  svg: {
    "--el-face-top": "light-dark(#d6d5d1, #47463f)",
    "--el-face-bot": "light-dark(#c4c3bd, #34332d)",
    "--el-side": "light-dark(#bcbbb5, #2c2b26)",
    // Single source of truth for the isometric tilt, so the co-registered sheet
    // faces (top, keyline, thickness) can never drift out of registration.
    "--el-tilt": "scaleY(0.46) rotate(45deg)",
    // Pointer height as an elevation driver: 1 when the cursor is at the top of
    // the card, 0 at the bottom (parks at 0.5 with no pointer).
    "--el-lift": "calc(1 - var(--ds-illo-py, 0.5))",
    // How far the sheets fan, as a factor on the three lift steps below. It is
    // trimmed only where the engaged framing is enlarged, because that is the
    // only place the fan needs trimming — the sheets have to clear the copy at a
    // scale they were not drawn at. A device that cannot hover never gets the
    // enlargement, and can still reach the engaged state through `:focus-within`,
    // so trimming there would shorten the fan against nothing.
    "--el-fan": {
      default: 1,
      "@media (hover: hover)": 0.8,
    },
  },
  topStop0: {
    stopColor: {
      default: "var(--el-face-top)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "color-mix(in oklab, var(--el-face-top), var(--ds-illo-hue) 12%)",
    },
    transition: "stop-color 520ms ease",
  },
  topStop1: {
    stopColor: {
      default: "var(--el-face-bot)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "color-mix(in oklab, var(--el-face-bot), var(--ds-illo-hue) 7%)",
    },
    transition: "stop-color 520ms ease",
  },
  // Dim grey at rest, full alive on hover. The pointer only ever moves the sheets;
  // the illustration itself sits in one of two framings, and this group carries
  // the whole of it — grid included, which is why the surface no longer holds
  // still between the two (see the note on the grid in the markup above).
  //
  // Both framings are hand-tuned rather than derived, so the numbers below are the
  // record of what was chosen and these notes only explain the mechanism.
  //
  // The corner is the transform origin because `preserveAspectRatio="xMaxYMax"`
  // already anchors the illustration there, so growth keeps that corner fixed and
  // pushes everything else away from it. That is also why a scale alone cannot
  // tuck the stack in: the stack is composed over the grid in the middle of the
  // box, and its margin from the corner grows right along with it. The translate
  // is what carries it out, and past the edge — at rest the far side of the stack
  // and most of the grid are cropped, which is the intent.
  //
  // Engaging the tile opens it back out, though not to the framing the illustration
  // is composed at: it lands lower and further right, and slightly larger, so the
  // stack still meets the card's right edge with the sheets fanned. It is a
  // different crop, not an uncropped view.
  //
  // The pair is gated to devices that can hover, the way the component specimens'
  // resting treatment is: each framing is only reachable through the other, and a
  // phone has no way in, so it would be held in one of them with no exit. Touch
  // gets the composed framing instead — the widest view of the stack, and the one
  // the illustration was drawn at. It is only the *framing* that is gated: the fan,
  // the grey -> gold bloom and the opacity lift all key off `:focus-within` too,
  // which a device without hover can still reach, so it sees those.
  illustration: {
    opacity: {
      default: 0.42,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 1,
    },
    transformBox: "view-box",
    transformOrigin: "100% 100%",
    transform: {
      default: "translate(4px, 4px)",
      "@media (hover: hover)": {
        default: RESTING_FRAME,
        [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
          "translate(50px, 20px) scale(1.1)",
        // Reduced motion keeps the resting framing and simply never animates out
        // of it. The stack still blooms grey -> gold, the same trade the pointer
        // lean already makes.
        [motionConstants.REDUCED_MOTION]: RESTING_FRAME,
      },
    },
    // Paced with the bloom rather than with the faster pointer-driven motion
    // below, so the reframe and the colour land together as one move instead of
    // the card waking up in two steps.
    transition: {
      default: "opacity 520ms ease, transform 520ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  // The grid lines: thin grey lattice at rest, warming to gold on hover.
  grid: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: {
      default: 0.26,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.52,
    },
    transition: "opacity 520ms ease, stroke 520ms ease",
  },
  bloom: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.55,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.85)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scale(1)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms ease, transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  // At rest the three sheets sit in a tight stack with equal gaps (grid->low,
  // low->mid, mid->high all ~15px). On hover the gaps open up graduated by
  // pointer height (--el-lift): the grid->low gap grows least, low->mid more, and
  // mid->high most, so raising the cursor fans the stack apart from the top down.
  // Each rank's vertical offset is the cumulative gap growth of the ranks below it.
  // The horizontal pointer slide is graduated the same way — higher ranks (further
  // from the fixed grid) drift more with --ds-illo-mx, giving the stack parallax depth.
  sheetLow: {
    transformBox: "view-box",
    transform: {
      default: "translate(0px, 14px)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "translate(calc(var(--ds-illo-mx) * 4px), calc(14px - var(--el-lift) * 7px * var(--el-fan)))",
      [motionConstants.REDUCED_MOTION]: "translate(0px, 14px)",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  sheetMid: {
    transformBox: "view-box",
    transform: {
      default: "translate(0px, -1px)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "translate(calc(var(--ds-illo-mx) * 12px), calc(-1px - var(--el-lift) * 22px * var(--el-fan)))",
      [motionConstants.REDUCED_MOTION]: "translate(0px, -1px)",
    },
    transition: {
      default: "transform 300ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  sheetHigh: {
    transformBox: "view-box",
    transform: {
      default: "translate(0px, -16px)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "translate(calc(var(--ds-illo-mx) * 22px), calc(-16px - var(--el-lift) * 47px * var(--el-fan)))",
      [motionConstants.REDUCED_MOTION]: "translate(0px, -16px)",
    },
    transition: {
      default: "transform 340ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Soft contact shadow hugging each sheet's underside; tight at rest, growing
  // softer/wider as the stack climbs on hover, reinforcing the elevation cue.
  dropShadow: {
    transformBox: "fill-box",
    transformOrigin: "center",
    opacity: 0.5,
    transform: {
      default: "scale(0.9)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "scale(calc(0.85 + var(--el-lift) * 0.5))",
      [motionConstants.REDUCED_MOTION]: "scale(0.9)",
    },
    transition: {
      default: "transform 260ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Shared isometric projection for the sheet faces: the tilt lives here as the
  // single applied source so top and keyline inherit it and only `side` overrides
  // (rounded corners survive the transform).
  face: {
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: "var(--el-tilt)",
  },
  // Thickness sliver: the same face nudged down, a shade darker; overrides the
  // base tilt to sink below the top face.
  side: {
    fill: {
      default: "var(--el-side)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "color-mix(in oklab, var(--el-side), var(--ds-illo-hue) 10%)",
    },
    transform: "translateY(7px) var(--el-tilt)",
    transition: "fill 520ms ease",
  },
  // The keyline that makes each sheet read as line art rather than a rendered slab.
  keyline: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1.5,
    strokeLinejoin: "round",
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)]: 0.95,
    },
    transition: "opacity 520ms ease, stroke 520ms ease",
  },
});
