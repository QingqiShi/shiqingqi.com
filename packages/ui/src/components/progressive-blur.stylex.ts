import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

// Where the blur cannot be drawn, or should not be. `backdrop-filter` is the
// only way to reach the page from an element in front of it, so without it
// there is nothing to fall back to but the scrim the design language replaced —
// dimming is worse than blurring, and both are better than a floating surface
// with nothing separating it from the page at all.
const NO_BACKDROP_FILTER = "@supports not (backdrop-filter: blur(1px))";
const REDUCED_TRANSPARENCY = "@media (prefers-reduced-transparency: reduce)";

const MASK_1 =
  "radial-gradient(circle var(--ds-blur-reach) at var(--ds-blur-x) var(--ds-blur-y), #000 80%, transparent 100%)";
const MASK_2 =
  "radial-gradient(circle var(--ds-blur-reach) at var(--ds-blur-x) var(--ds-blur-y), #000 60%, transparent 80%)";
const MASK_3 =
  "radial-gradient(circle var(--ds-blur-reach) at var(--ds-blur-x) var(--ds-blur-y), #000 40%, transparent 60%)";
const MASK_4 =
  "radial-gradient(circle var(--ds-blur-reach) at var(--ds-blur-x) var(--ds-blur-y), #000 20%, transparent 40%)";
const MASK_5 =
  "radial-gradient(circle var(--ds-blur-reach) at var(--ds-blur-x) var(--ds-blur-y), #000 0%, transparent 20%)";

// Five bands of one falloff. The weakest blur reaches furthest and paints
// first; each stronger band composites over the already-blurred result, so the
// radius accumulates toward the origin rather than switching on at a line.
//
// The bands step by a factor of two, which is what keeps the seams invisible: a
// band only ever blends against the band below it, so the ghost it leaves —
// blurred content composited over sharp content at partial alpha — is worth its
// own blur alone. One layer masked from full to zero ghosts visibly at the same
// total radius, which is why this is five elements rather than one.
export const progressiveBlur = stylex.create({
  root: {
    position: "fixed",
    inset: 0,
    // The blur belongs to the page, so it never takes the pointer. Whatever
    // dismisses the floating element keeps that job.
    pointerEvents: "none",
    backgroundColor: {
      default: null,
      [NO_BACKDROP_FILTER]: color.bgScrim,
      [REDUCED_TRANSPARENCY]: color.bgScrim,
    },
  },
  // The radius is capped because compositing five full-viewport blurs is paid
  // for on every frame the page behind them moves.
  vars: (radius: string, reach: string, originX: string, originY: string) => ({
    "--ds-blur-radius": `min(${radius}, 40px)`,
    "--ds-blur-reach": reach,
    "--ds-blur-x": originX,
    "--ds-blur-y": originY,
  }),
  band_1: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(calc(var(--ds-blur-radius) / 16))",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_1,
    WebkitMaskImage: MASK_1,
  },
  band_2: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(calc(var(--ds-blur-radius) / 8))",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_2,
    WebkitMaskImage: MASK_2,
  },
  band_3: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(calc(var(--ds-blur-radius) / 4))",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_3,
    WebkitMaskImage: MASK_3,
  },
  band_4: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(calc(var(--ds-blur-radius) / 2))",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_4,
    WebkitMaskImage: MASK_4,
  },
  band_5: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(var(--ds-blur-radius))",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_5,
    WebkitMaskImage: MASK_5,
  },
});
