import { d, tgpu } from "typegpu";
import { MAX_RECTS } from "./debug-colors.ts";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One rect of the minimap, in CSS px from the top-left corner of the
 * target, and its colour with straight alpha.
 *
 * @internal
 */
export const DebugRect = d.struct({
  rect: d.vec4f,
  color: d.vec4f,
});

/**
 * The debug view's own group: the rects of the minimap.
 *
 * @internal
 */
export const debugLayout = tgpu
  .bindGroupLayout({
    rects: {
      storage: d.arrayOf(DebugRect, MAX_RECTS),
      visibility: ["vertex"],
    },
  })
  .$idx(EFFECT_GROUP);
