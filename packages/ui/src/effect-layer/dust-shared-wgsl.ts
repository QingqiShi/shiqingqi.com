/**
 * The byte size of one `DustParticle`.
 *
 * @internal
 */
export const DUST_PARTICLE_BYTES = 56;

/**
 * The byte size of one `DustElement`.
 *
 * @internal
 */
export const DUST_ELEMENT_BYTES = 12;

/**
 * What the dust simulation and its drawing share: a particle, the values the
 * effect adds to each entry of `effectElements`, random numbers, and points
 * on an element's edge. Put it after `PAGE_WGSL` or `TARGET_WGSL`.
 *
 * @internal
 */
export const DUST_SHARED_WGSL = /* wgsl */ `
struct DustParticle {
  position: vec2f,
  velocity: vec2f,
  age: f32,
  life: f32,
  // From 0 to 1, fixed at birth: its size and its flicker.
  seed: f32,
  // sRGB-encoded, alpha its opacity, as unpack4x8unorm reads it.
  color: u32,
  // The id of the element that shed it, so that element does not pull it in.
  emitter: u32,
  // Seconds it floats before the extractor fans pull it.
  drift: f32,
  // 1 far from an extractor fan, falling to 0 at its edge.
  intake: f32,
  // The id of the scope of the element that shed it.
  scope: u32,
  // The index of that scope in effectScopes this frame.
  scopeIndex: u32,
  // 1 when it draws over a dark backdrop, fixed at birth like its colour.
  dark: u32,
}

// One per entry of effectElements, at the same index.
struct DustElement {
  // The colour of the dust it sheds, packed like DustParticle.color.
  color: u32,
  // How far from its edge an extractor fan pulls, in CSS px.
  reach: f32,
  // 1 when what its scope draws over is dark.
  dark: u32,
}

fn pcg(value: u32) -> u32 {
  let state = value * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

fn random(state: ptr<function, u32>) -> f32 {
  *state = pcg(*state);
  return f32(*state) / 4294967295.0;
}

// The outward normal of an element's edge nearest a page point.
fn elementNormal(element: EffectElement, page: vec2f) -> vec2f {
  let step = vec2f(0.5, 0.0);
  let gradient = vec2f(
    effectElementDistance(element, page + step.xy) - effectElementDistance(element, page - step.xy),
    effectElementDistance(element, page + step.yx) - effectElementDistance(element, page - step.yx),
  );
  let size = length(gradient);
  return select(vec2f(0.0, -1.0), gradient / size, size > 1e-5);
}

struct EdgePoint {
  position: vec2f,
  normal: vec2f,
}

// The point "portion" of the way round an element's edge, clockwise
// from the top-left corner, and the edge's outward normal there.
fn edgePoint(element: EffectElement, portion: f32) -> EdgePoint {
  let size = element.rect.zw;
  let perimeter = 2.0 * (size.x + size.y);
  let along = portion * perimeter;
  var offset: vec2f;
  if (along < size.x) {
    offset = vec2f(along, 0.0);
  } else if (along < size.x + size.y) {
    offset = vec2f(size.x, along - size.x);
  } else if (along < 2.0 * size.x + size.y) {
    offset = vec2f(2.0 * size.x + size.y - along, size.y);
  } else {
    offset = vec2f(0.0, perimeter - along);
  }
  let corner = element.rect.xy + offset;
  let normal = elementNormal(element, corner);
  return EdgePoint(corner - normal * effectElementDistance(element, corner), normal);
}

// A random point on an element's edge, each length of edge as likely as
// any other, and the edge's outward normal there.
fn randomEdgePoint(element: EffectElement, state: ptr<function, u32>) -> EdgePoint {
  return edgePoint(element, random(state));
}
`;
