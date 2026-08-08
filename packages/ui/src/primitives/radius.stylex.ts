import * as stylex from "@stylexjs/stylex";

// `inner = outer − inset`, for a surface sitting at another surface's corner.
// Concentric corners stay parallel; equal radii leave the gap between them
// pinching at the corner and opening out along the edge.
//
// Clamped at zero so an inset larger than the radius squares the corner off
// rather than inverting it. A button or a badge is not a nested surface and
// keeps its own full radius.
export const radius = stylex.create({
  inside: (outer: string, inset: string) => ({
    borderRadius: `max(0px, calc(${outer} - ${inset}))`,
  }),
});
