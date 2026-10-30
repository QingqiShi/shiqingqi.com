import { d, std, tgpu } from "typegpu";
import { effectElementDistance } from "./effect-element-distance.ts";
import { pageLayout } from "./page-layout.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import { targetLayout } from "./target-layout.ts";

/**
 * How much of a page point shows for an effect in the scope at this index of
 * `effectScopes`: 1 inside its Effect container and each one around it, 0
 * outside, with an anti-aliased edge one pixel wide. 1 on the page.
 *
 * @internal
 */
export const effectClip = tgpu.fn(
  [d.u32, d.vec2f],
  d.f32,
)((scope, page) => {
  "use gpu";
  let coverage = d.f32(1);
  let index = scope;
  for (
    let depth = d.u32(0);
    index !== PAGE_SCOPE && depth < pageLayout.$.effectPage.scopeCount;
    depth += 1
  ) {
    const container =
      pageLayout.$.effectElements[pageLayout.$.effectScopes[index].container];
    coverage *= std.saturate(
      0.5 -
        effectElementDistance(container, page) *
          targetLayout.$.effectTarget.pixelScale.x,
    );
    index = container.scope;
  }
  return coverage;
});
