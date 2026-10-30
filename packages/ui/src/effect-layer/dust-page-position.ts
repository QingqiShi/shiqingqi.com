import { d, std, tgpu } from "typegpu";
import { DUST_ON_VIEWPORT, DustParticle } from "./dust-layout.ts";
import { pageLayout } from "./page-layout.ts";

/**
 * Where a dust particle is, in page coordinates.
 *
 * @internal
 */
export const dustPagePosition = tgpu.fn(
  [DustParticle],
  d.vec2f,
)((particle) => {
  "use gpu";
  return std.select(
    particle.position,
    particle.position.add(pageLayout.$.effectPage.viewport.xy),
    (particle.flags & DUST_ON_VIEWPORT) !== 0,
  );
});
