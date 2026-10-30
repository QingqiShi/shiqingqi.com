import type { Edges } from "./observe-move.ts";
import { clamp, parseCssColor, type EffectColor } from "./parse-css-color.ts";

/**
 * Corner radii in CSS px, top-left first and then clockwise.
 *
 * @internal
 */
export type CornerRadii = readonly [number, number, number, number];

/**
 * What the effect layer reads from one element. Lengths are CSS px and
 * positions are page coordinates, from the top-left corner of the document.
 *
 * @internal
 */
export interface ElementBox {
  /** The border box. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radii: CornerRadii;
  /**
   * The exponent `n` of the corners' superellipse, `|x|ⁿ + |y|ⁿ = 1`: 2 for a
   * circular arc, 4 for a squircle.
   */
  readonly cornerExponent: number;
  /** The computed `background-color`. */
  readonly fill: EffectColor;
  /**
   * How far CSS `filter: grayscale()` on the element and its ancestors takes
   * the colour out of what it paints: 0 for full colour, 1 for grey. Effects
   * pass it to `effectGrayscale` on the GPU.
   */
  readonly grayscale: number;
}

const TRANSPARENT: EffectColor = [0, 0, 0, 0];
const ROUND_EXPONENT = 2;
const SHAPE_KEYWORDS: Readonly<Partial<Record<string, number>>> = {
  round: 1,
  squircle: 2,
  bevel: 0,
  scoop: -1,
  square: Number.POSITIVE_INFINITY,
  notch: Number.NEGATIVE_INFINITY,
};
// 2^±4 is close enough to a square or a notch, and keeps powers finite.
const MAX_SHAPE_PARAMETER = 4;

/** One axis of a computed radius: px, or a percentage of `size`. */
function readRadius(text: string, size: number) {
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return text.endsWith("%") ? (value / 100) * size : value;
}

/**
 * Resolves the computed `border-*-radius` of each corner, top-left first and
 * then clockwise, against a box. A percentage takes the box's width
 * horizontally and its height vertically. Radii that overlap are scaled down
 * together, as CSS draws them. An elliptical corner gives its shorter radius.
 *
 * @internal
 */
export function resolveCornerRadii(
  width: number,
  height: number,
  corners: readonly [string, string, string, string],
): CornerRadii {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners.map((corner) => {
    const [horizontal = "", vertical = horizontal] = corner.trim().split(/\s+/);
    return {
      x: readRadius(horizontal, width),
      y: readRadius(vertical, height),
    };
  });
  const fit = (length: number, first: number, second: number) =>
    first + second > 0 ? length / (first + second) : 1;
  const scale = Math.min(
    1,
    fit(width, topLeft.x, topRight.x),
    fit(width, bottomLeft.x, bottomRight.x),
    fit(height, topLeft.y, bottomLeft.y),
    fit(height, topRight.y, bottomRight.y),
  );
  const radius = ({ x, y }: { x: number; y: number }) => Math.min(x, y) * scale;
  return [
    radius(topLeft),
    radius(topRight),
    radius(bottomRight),
    radius(bottomLeft),
  ];
}

/**
 * The superellipse exponent of a computed `corner-*-shape`: a keyword or
 * `superellipse(K)`, whose curve is `|x|^(2^K) + |y|^(2^K) = 1`. A browser
 * without `corner-shape` gives an empty value, which is a circular arc.
 *
 * @internal
 */
export function readCornerExponent(shape: string): number {
  const text = shape.trim().toLowerCase();
  const match = /^superellipse\((.+)\)$/.exec(text);
  const parameter =
    match === null
      ? SHAPE_KEYWORDS[text]
      : Number(match[1].trim().replace("infinity", "Infinity"));
  if (parameter === undefined || Number.isNaN(parameter)) {
    return ROUND_EXPONENT;
  }
  return (
    2 **
    Math.min(MAX_SHAPE_PARAMETER, Math.max(-MAX_SHAPE_PARAMETER, parameter))
  );
}

const colorCache = new Map<string, EffectColor>();
const MAX_CACHED_COLORS = 256;

/**
 * A computed `background-color` in the GPU's form, transparent when it cannot
 * be read. It remembers the colours it has read.
 *
 * @internal
 */
export function readFill(backgroundColor: string) {
  let fill = colorCache.get(backgroundColor);
  if (fill === undefined) {
    fill = parseCssColor(backgroundColor) ?? TRANSPARENT;
    if (colorCache.size >= MAX_CACHED_COLORS) {
      colorCache.clear();
    }
    colorCache.set(backgroundColor, fill);
  }
  return fill;
}

const GRAYSCALE_FUNCTION = /grayscale\(([^)]*)\)/g;

/** The amount of one `grayscale()`, which is 1 when it has no argument. */
function readGrayscaleAmount(argument: string) {
  const text = argument.trim();
  if (text === "") {
    return 1;
  }
  const value = Number.parseFloat(text) / (text.endsWith("%") ? 100 : 1);
  return Number.isFinite(value) ? clamp(value) : 0;
}

/**
 * How far a computed `filter` takes the colour out, from 0 to 1: each of its
 * `grayscale()` functions keeps a share of the colour that the one before it
 * kept.
 *
 * @internal
 */
export function readGrayscale(filter: string) {
  if (filter === "none") {
    return 0;
  }
  let kept = 1;
  for (const [, argument = ""] of filter.matchAll(GRAYSCALE_FUNCTION)) {
    kept *= 1 - readGrayscaleAmount(argument);
  }
  return 1 - kept;
}

/**
 * How far the `filter` of the element and of each ancestor together take
 * the colour out of what the element paints, from 0 to 1.
 *
 * @internal
 */
export function effectiveGrayscale(
  element: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  let kept = 1;
  for (
    let node: Element | null = element;
    node !== null && kept > 0;
    node = node.parentElement
  ) {
    kept *= 1 - readGrayscale(styleOf(node).filter);
  }
  return 1 - kept;
}

/**
 * The computed insets of a positioned box, top first and then clockwise,
 * with `auto` kept.
 *
 * @internal
 */
export interface Insets {
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
  readonly left: string;
}

/**
 * Reads the computed insets of a box, with `auto` kept.
 *
 * @internal
 */
export function readInsets(
  box: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
): Insets {
  // getComputedStyle gives the used px value of an `auto` inset on a
  // positioned box. Thus, read the computed style map, which keeps `auto`.
  if ("computedStyleMap" in box) {
    const map = box.computedStyleMap();
    const read = (side: string) => map.get(side)?.toString() ?? "";
    return {
      top: read("top"),
      right: read("right"),
      bottom: read("bottom"),
      left: read("left"),
    };
  }
  const { top, right, bottom, left } = styleOf(box);
  return { top, right, bottom, left };
}

/**
 * A computed inset in px, or `null` for `auto` or a value it cannot read.
 *
 * @internal
 */
export function readInset(text: string) {
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : null;
}

/**
 * The padding of a scroller, in px. A sticky box in the scroller stops at
 * this padding, not at the scroller's padding edge.
 *
 * @internal
 */
export function scrollerPadding(
  scroller: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
): Edges {
  const style = styleOf(scroller);
  const px = (value: string) => Number.parseFloat(value) || 0;
  return {
    left: px(style.paddingLeft),
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
  };
}

/**
 * The box that a sticky box in a scroller sticks to, in viewport
 * coordinates: the scroller's padding box less its padding.
 *
 * @internal
 */
export function stickyViewOf(
  scroller: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
): Edges {
  const rect = scroller.getBoundingClientRect();
  const padding = scrollerPadding(scroller, styleOf);
  const left = rect.left + scroller.clientLeft;
  const top = rect.top + scroller.clientTop;
  return {
    left: left + padding.left,
    top: top + padding.top,
    right: left + scroller.clientWidth - padding.right,
    bottom: top + scroller.clientHeight - padding.bottom,
  };
}

const SEEN = {
  opacityProperty: true,
  visibilityProperty: true,
} satisfies CheckVisibilityOptions;

/**
 * Measures one element where the browser has laid it out now, in viewport
 * coordinates, or returns `null` when it has no box or nobody can see it:
 * it, or an ancestor, has `opacity: 0` or `visibility: hidden`. `styleOf`
 * lets the elements of one frame share the computed styles of their
 * ancestors.
 *
 * @internal
 */
export function readElementBox(
  element: Element,
  styleOf: (element: Element) => CSSStyleDeclaration,
): ElementBox | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || !element.checkVisibility(SEEN)) {
    return null;
  }
  const style = styleOf(element);
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    radii: resolveCornerRadii(rect.width, rect.height, [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ]),
    cornerExponent: readCornerExponent(
      style.getPropertyValue("corner-top-left-shape"),
    ),
    fill: readFill(style.backgroundColor),
    grayscale: effectiveGrayscale(element, styleOf),
  };
}
