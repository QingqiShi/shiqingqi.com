import * as stylex from "@stylexjs/stylex";
import { layer } from "../tokens.stylex.ts";

// Where the blur cannot be drawn, or should not be — falls back to the same
// mask-image fade this replaced, rather than to nothing (see progressive-blur.stylex.ts
// for the floating-element sibling of this rationale).
const NO_BACKDROP_FILTER = "@supports not (backdrop-filter: blur(1px))";
const REDUCED_TRANSPARENCY = "@media (prefers-reduced-transparency: reduce)";

// The pre-blur fade formula, unchanged: each end collapses to 0px when that
// edge has nothing scrolled past it, via --ds-scroll-fade-start/-end.
const FALLBACK_VERTICAL =
  "linear-gradient(to bottom, transparent 0, #000 var(--ds-scroll-fade-start), #000 calc(100% - var(--ds-scroll-fade-end)), transparent 100%)";
const FALLBACK_HORIZONTAL =
  "linear-gradient(to right, transparent 0, #000 var(--ds-scroll-fade-start), #000 calc(100% - var(--ds-scroll-fade-end)), transparent 100%)";

/**
 * The scroll container itself. `vertical`/`horizontal` set the scroll axis;
 * `vars` feeds the fallback mask's collapsing 0px/fadeSize stops and the size
 * every edge band below inherits.
 *
 * Named `scrollFadeContainer`/`scrollFadeEdge` rather than "scroll mask" — the
 * glossary's name for this concept — because `ScrollFade` is a published
 * export and renaming it is tracked separately from this change.
 */
export const scrollFadeContainer = stylex.create({
  vertical: {
    overflowX: "hidden",
    overflowY: "auto",
    minBlockSize: 0,
    // Containing block for the absolutely-positioned edge bands below.
    position: "relative",
    maskImage: {
      default: "none",
      [NO_BACKDROP_FILTER]: FALLBACK_VERTICAL,
      [REDUCED_TRANSPARENCY]: FALLBACK_VERTICAL,
    },
    WebkitMaskImage: {
      default: "none",
      [NO_BACKDROP_FILTER]: FALLBACK_VERTICAL,
      [REDUCED_TRANSPARENCY]: FALLBACK_VERTICAL,
    },
    // The default border-box clip would also clip a focusable descendant's
    // outline, painted outside its own box. Only load-bearing while the
    // fallback mask above is actually active.
    maskClip: "no-clip",
  },
  horizontal: {
    overflowX: "auto",
    overflowY: "hidden",
    minInlineSize: 0,
    position: "relative",
    maskImage: {
      default: "none",
      [NO_BACKDROP_FILTER]: FALLBACK_HORIZONTAL,
      [REDUCED_TRANSPARENCY]: FALLBACK_HORIZONTAL,
    },
    WebkitMaskImage: {
      default: "none",
      [NO_BACKDROP_FILTER]: FALLBACK_HORIZONTAL,
      [REDUCED_TRANSPARENCY]: FALLBACK_HORIZONTAL,
    },
    maskClip: "no-clip",
  },
  vars: (size: string, startStop: string, endStop: string) => ({
    "--ds-scroll-fade-size": size,
    "--ds-scroll-fade-start": startStop,
    "--ds-scroll-fade-end": endStop,
  }),
});

// Four bands of one linear falloff, direction supplied per edge through the
// inherited --ds-scroll-fade-direction (physical "to bottom"/"to top"/"to
// right"/"to left" — this never mirrors in RTL, matching the fade it
// replaces). Weakest blur reaches furthest and paints first; strongest sits
// right at the true edge. Radius steps by 2x so each band only ever blends
// against the one below it — a single mask stepped from full to zero over the
// same span ghosts visibly, which is why this is four elements, not one.
const MASK_1 =
  "linear-gradient(var(--ds-scroll-fade-direction), #000 75%, transparent 100%)";
const MASK_2 =
  "linear-gradient(var(--ds-scroll-fade-direction), #000 50%, transparent 75%)";
const MASK_3 =
  "linear-gradient(var(--ds-scroll-fade-direction), #000 25%, transparent 50%)";
const MASK_4 =
  "linear-gradient(var(--ds-scroll-fade-direction), #000 0%, transparent 25%)";

/**
 * One edge's stack of blur bands. `blockStart`/`blockEnd`/`inlineStart`/
 * `inlineEnd` position the band group at the corresponding edge, sized to the
 * inherited `--ds-scroll-fade-size`; `vars` sets that edge's fade direction.
 * `band_1`..`band_4` are the falloff itself, stacked in that order so the
 * weakest paints first.
 */
export const scrollFadeEdge = stylex.create({
  vars: (direction: string) => ({
    "--ds-scroll-fade-direction": direction,
  }),
  blockStart: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    blockSize: "var(--ds-scroll-fade-size)",
    zIndex: layer.content,
    // The blur belongs to the edge, not the pointer — clicks and hovers pass
    // through to the real content it sits over.
    pointerEvents: "none",
  },
  blockEnd: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    blockSize: "var(--ds-scroll-fade-size)",
    zIndex: layer.content,
    pointerEvents: "none",
  },
  inlineStart: {
    position: "absolute",
    insetInlineStart: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
    inlineSize: "var(--ds-scroll-fade-size)",
    zIndex: layer.content,
    pointerEvents: "none",
  },
  inlineEnd: {
    position: "absolute",
    insetInlineEnd: 0,
    insetBlockStart: 0,
    insetBlockEnd: 0,
    inlineSize: "var(--ds-scroll-fade-size)",
    zIndex: layer.content,
    pointerEvents: "none",
  },
  band_1: {
    position: "absolute",
    inset: 0,
    backdropFilter: {
      default: "blur(1px)",
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
      default: "blur(2px)",
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
      default: "blur(4px)",
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
      default: "blur(8px)",
      [NO_BACKDROP_FILTER]: "none",
      [REDUCED_TRANSPARENCY]: "none",
    },
    maskImage: MASK_4,
    WebkitMaskImage: MASK_4,
  },
});
