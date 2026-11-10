import { d, tgpu } from "typegpu";
import { EFFECT_GROUP } from "./target-layout.ts";

/**
 * One Slider whose panel is liquid this frame: a quad over its groove,
 * which draws the panel as a clear body of liquid that bends the groove's
 * content under it, with the handle on it.
 *
 * - `size` is the groove's size in its own px, before a transform scales
 *   it. Every other length is in those px.
 * - `inner` is the groove's inside: left, top, width, height.
 * - `edge` is the panel's far edge from the left of `inner`, and `bulge`
 *   how far the middle of that edge swells past it as the liquid moves.
 * - `melt` is how much of the liquid shows, from 0 to 1.
 * - `corner` is the radius of the panel's corners, and `cornerPower` their
 *   shape: 2 is a circle, 4 a squircle.
 * - `handle` is the middle of the handle across, half its width, the middle
 *   of the groove down, and the top and the bottom of its top piece.
 * - `under` is the groove's fill and `handleColor` the handle's, sRGB, with
 *   straight alpha.
 * - `dark` is 1 on a dark backdrop.
 *
 * @internal
 */
export const SliderLiquidInstance = d.struct({
  element: d.u32,
  dark: d.u32,
  melt: d.f32,
  size: d.vec2f,
  edge: d.f32,
  bulge: d.f32,
  inner: d.vec4f,
  corner: d.f32,
  cornerPower: d.f32,
  handleRadius: d.f32,
  handleX: d.f32,
  handleCenter: d.f32,
  handleTop: d.vec2f,
  under: d.vec4f,
  handleColor: d.vec4f,
});

/**
 * The Slider liquid effect's own group: each Slider whose panel is liquid
 * this frame.
 *
 * @internal
 */
export const sliderLiquidLayout = tgpu
  .bindGroupLayout({
    sliders: {
      storage: d.arrayOf(SliderLiquidInstance),
      visibility: ["vertex", "fragment"],
    },
  })
  .$idx(EFFECT_GROUP);
