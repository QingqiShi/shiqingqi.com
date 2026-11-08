import { d, std } from "typegpu";

/**
 * The way to the one light of the effect layer, from the page: up, to the
 * top left. Each effect that lights a surface lights it from here, so that
 * the effects of a page agree.
 *
 * @internal
 */
export const TO_LIGHT = std.normalize(d.vec3f(-0.42, -0.66, 0.62));

/**
 * Where the eye, straight above the page, sees content that lies `depth`
 * CSS px under a clear surface with the unit `normal` and the index of
 * refraction `index`: the offset from the point on the page to the point of
 * the content, in CSS px. The ray bends towards the normal as it goes into
 * the surface, so a tilt shows the content from its high side, and a dome
 * magnifies it. An effect reads its content at the point plus this offset,
 * such as with `contentAt`.
 *
 * @internal
 */
export const refractionOffset = (
  normal: d.v3f,
  depth: number,
  index: number,
) => {
  "use gpu";
  const sinTheta = std.min(std.length(normal.xy), 1);
  const theta = std.asin(sinTheta);
  const phi = std.asin(sinTheta / index);
  return normal.xy.mul(
    (-depth * std.tan(theta - phi)) / std.max(sinTheta, 1e-6),
  );
};
