import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { illoBase, illoMarker } from "./illustration.stylex.ts";

/**
 * Elevation foundation-card illustration: an isometric sheet raised above a
 * flat grid "surface", drawn in the same flat, line-forward language as its
 * siblings. The sheet is a quiet grey face with a thin keyline and a thickness
 * sliver (so it reads as a 3D object) floating over the grid plane it sits on,
 * with a soft shadow pooled in the gap between them — the gap is the elevation.
 * On hover the sheet lifts, the keylines and grid warm grey -> gold, and the
 * shadow blooms.
 *
 * The grid is a flat square lattice projected to isometric and baked into
 * screen-space paths (see GRID_LINES below); the sheet faces are plain rounded
 * rects tilted by `scaleY(0.46) rotate(45deg)` (rotate rightmost so it applies
 * first, then the squish), which keeps their rounded corners for free.
 */
const GRID_CELLS = 6; // grid squares per axis
const GRID_CX = 233; // screen centre of the surface
const GRID_CY = 122;
const GRID_AX = 43; // screen dx per unit of (u - v)
const GRID_AY = 20; // screen dy per unit of (u + v)

// Project a point (u, v) on the flat surface (each -1..1) to isometric screen space.
function projectSurface(u: number, v: number) {
  const x = GRID_CX + (u - v) * GRID_AX;
  const y = GRID_CY + (u + v) * GRID_AY;
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

// A flat isometric lattice: one straight line per division in each direction —
// constant-v lines run across, constant-u lines run into the scene.
const GRID_LINES = Array.from(
  { length: GRID_CELLS + 1 },
  (_, i) => (i / GRID_CELLS) * 2 - 1,
).flatMap((c) => [
  `M${projectSurface(-1, c)}L${projectSurface(1, c)}`,
  `M${projectSurface(c, -1)}L${projectSurface(c, 1)}`,
]);

// Shared geometry for the three co-registered sheet faces (thickness, top,
// keyline) — one source of truth alongside --el-tilt so resizing the sheet can
// never leave the faces out of registration.
const SHEET_RECT = { x: 178, y: 50, width: 110, height: 110, rx: 21 };

// Shared geometry for the two stacked shadow-pool ellipses (ink + gold) so the
// halves of the crossfade always sit on the same footprint.
const POOL_ELLIPSE = { cx: 233, cy: 128, rx: 82, ry: 20 };

export function ElevationIllustration() {
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
        <radialGradient id="dsi-elevation-pool-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--ds-illo-ink)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--ds-illo-ink)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dsi-elevation-pool-hue" cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor="var(--ds-illo-hue-soft)"
            stopOpacity="0.72"
          />
          <stop offset="45%" stopColor="var(--ds-illo-hue)" stopOpacity="0.3" />
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

      <g css={styles.scene}>
        {/* The surface the sheet sits on: a flat isometric grid. */}
        <g css={styles.gridFollow}>
          <g css={styles.grid} mask="url(#dsi-elevation-grid-mask)">
            {/* All lines share one style, so they render as a single multi-subpath. */}
            <path d={GRID_LINES.join("")} />
          </g>
        </g>

        {/* Soft shadow cast onto the grid in the gap beneath the raised sheet —
            painted over the surface so it reads as resting on it, not under it. */}
        <g css={styles.poolFollow}>
          <ellipse
            css={styles.poolInk}
            {...POOL_ELLIPSE}
            fill="url(#dsi-elevation-pool-ink)"
          />
          <ellipse
            css={styles.poolHue}
            {...POOL_ELLIPSE}
            fill="url(#dsi-elevation-pool-hue)"
          />
        </g>

        {/* The sheet: quiet grey face + thickness sliver, outlined in a keyline
            that warms grey -> gold. Floats above the grid; lifts a touch on
            hover. */}
        <g css={styles.slab}>
          <rect css={[styles.face, styles.side]} {...SHEET_RECT} />
          <rect
            css={styles.face}
            {...SHEET_RECT}
            fill="url(#dsi-elevation-top)"
          />
          <rect css={[styles.face, styles.topLine]} {...SHEET_RECT} />
        </g>
      </g>
    </svg>
  );
}

const styles = stylex.create({
  // Quiet grey face tokens, matched to the spacing bars so the sheet sits at the
  // same brightness as the rest of the set; warm slightly toward gold on hover.
  svg: {
    "--el-face-top": "light-dark(#d6d5d1, #47463f)",
    "--el-face-bot": "light-dark(#c4c3bd, #34332d)",
    "--el-side": "light-dark(#bcbbb5, #2c2b26)",
    // Single source of truth for the isometric tilt, so the three co-registered
    // sheet faces (top, keyline, thickness) can never drift out of registration.
    "--el-tilt": "scaleY(0.46) rotate(45deg)",
  },
  topStop0: {
    stopColor: {
      default: "var(--el-face-top)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--el-face-top), var(--ds-illo-hue) 12%)",
    },
    transition: "stop-color 520ms ease",
  },
  topStop1: {
    stopColor: {
      default: "var(--el-face-bot)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--el-face-bot), var(--ds-illo-hue) 7%)",
    },
    transition: "stop-color 520ms ease",
  },
  // Dim grey at rest, full alive; the whole scene leans a little toward the pointer.
  scene: {
    opacity: {
      default: 0.42,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 1,
    },
    transformBox: "view-box",
    // Nudged toward the card's bottom-right corner.
    transform: {
      default:
        "translate(calc(4px + var(--ds-illo-mx) * 5px), calc(8px + var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "translate(4px, 8px)",
    },
    transition: {
      default: "opacity 520ms ease, transform 320ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  poolFollow: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 12px), calc(var(--ds-illo-my) * 5px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 360ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // Ink glow at rest fades out as the gold pool blooms in — the family's
  // grey -> gold crossfade, borrowed from the borders bloom.
  poolInk: {
    opacity: {
      default: 0.5,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0,
    },
    transition: "opacity 520ms ease",
  },
  poolHue: {
    opacity: {
      default: 0,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.55,
    },
    transformBox: "fill-box",
    transformOrigin: "center",
    transform: {
      default: "scale(0.9)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "scale(1.14)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default:
        "opacity 520ms ease, transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
      [motionConstants.REDUCED_MOTION]: "opacity 520ms ease",
    },
  },
  // The grid parallax-leans toward the pointer, a little more than the sheet so
  // the surface reads as the deeper plane.
  gridFollow: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 10px), calc(var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transition: {
      default: "transform 340ms var(--ds-illo-ease)",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // The grid lines: thin grey lattice at rest, warming to gold on hover.
  grid: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    opacity: {
      default: 0.26,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.52,
    },
    transition: "opacity 520ms ease, stroke 520ms ease",
  },
  // Sheet sits close to the surface, lifting a touch on hover; parallax-leans
  // toward the pointer.
  slab: {
    transformBox: "view-box",
    transform: {
      default:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(-3px + var(--ds-illo-my) * 4px))",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "translate(calc(var(--ds-illo-mx) * 6px), calc(-12px + var(--ds-illo-my) * 4px))",
      [motionConstants.REDUCED_MOTION]: "translate(0px, -3px)",
    },
    transition: {
      default: "transform 560ms cubic-bezier(0.32, 0.72, 0, 1)",
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
  // Thickness sliver: the same sheet nudged down, a shade darker; overrides the
  // base tilt to sink below the top face.
  side: {
    fill: {
      default: "var(--el-side)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "color-mix(in oklab, var(--el-side), var(--ds-illo-hue) 10%)",
    },
    transform: "translateY(12px) var(--el-tilt)",
    transition: "fill 520ms ease",
  },
  // The keyline that makes the sheet read as line art rather than a rendered slab.
  topLine: {
    fill: "none",
    stroke: {
      default: "var(--ds-illo-ink)",
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]:
        "var(--ds-illo-hue)",
    },
    strokeWidth: 1.5,
    strokeLinejoin: "round",
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:hover, :focus-visible)", illoMarker)]: 0.95,
    },
    transition: "opacity 520ms ease, stroke 520ms ease",
  },
});
