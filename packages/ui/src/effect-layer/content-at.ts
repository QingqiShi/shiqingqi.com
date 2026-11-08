import { d, std } from "typegpu";
import { pageLayout } from "./page-layout.ts";

/**
 * The content of the element at `element` in `effectElements` at a page
 * point, premultiplied, from its snapshot, as `EFFECT_CONTENT` describes
 * it, or clear when it has none. A point outside the element's border box
 * reads the nearest point on its edge. To show the content bent, read it at
 * the point plus the bend, such as `refractionOffset`.
 *
 * @internal
 */
export const contentAt = (element: number, page: d.v2f) => {
  "use gpu";
  const rect = pageLayout.$.effectElements[element].rect;
  const content = pageLayout.$.effectElements[element].content;
  if (content.z <= 0) {
    return d.vec4f(0);
  }
  const inBox = std.saturate(page.sub(rect.xy).div(rect.zw));
  return std.textureSampleLevel(
    pageLayout.$.effectContent,
    pageLayout.$.effectContentSampler,
    content.xy.add(inBox.mul(content.zw)),
    0,
  );
};
