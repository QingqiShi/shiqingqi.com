import { parseCssColor, type EffectColor } from "./parse-css-color.ts";

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
  /**
   * Fixed to the viewport by its own `position: fixed` or an ancestor's. Its
   * place in the page then changes with every scroll, and it draws on the
   * fixed `<canvas>` element.
   */
  readonly fixed: boolean;
  readonly radii: CornerRadii;
  /**
   * The exponent `n` of the corners' superellipse, `|x|ⁿ + |y|ⁿ = 1`: 2 for a
   * circular arc, 4 for a squircle.
   */
  readonly cornerExponent: number;
  /** The computed `background-color`. */
  readonly fill: EffectColor;
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

const isSet = (value: string) => value !== "" && value !== "none";

/**
 * Whether a box with this computed style holds its `position: fixed`
 * descendants, so that they scroll with it instead of with the viewport.
 *
 * @internal
 */
export function holdsFixedDescendants(style: CSSStyleDeclaration) {
  return (
    [
      style.transform,
      style.translate,
      style.rotate,
      style.scale,
      style.perspective,
      style.filter,
      style.backdropFilter,
    ].some(isSet) ||
    style.transformStyle === "preserve-3d" ||
    style.contentVisibility === "auto" ||
    /\b(layout|paint|strict|content)\b/.test(style.contain) ||
    /\b(size|inline-size)\b/.test(style.containerType) ||
    /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter)\b/.test(
      style.willChange,
    )
  );
}

/**
 * Whether the element is fixed to the viewport: it, or an ancestor, has
 * `position: fixed`, and no ancestor of that box holds it in the document.
 *
 * @internal
 */
export function isFixedToViewport(
  element: Element,
  styleOf: (element: Element) => CSSStyleDeclaration = getComputedStyle,
) {
  let fixed = false;
  for (
    let node: Element | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const style = styleOf(node);
    if (fixed && holdsFixedDescendants(style)) {
      fixed = false;
    }
    if (style.position === "fixed") {
      fixed = true;
    }
  }
  return fixed;
}

/**
 * Measures one element where the browser has laid it out now, or returns
 * `null` when it has no box. `scrollX` and `scrollY` turn its viewport
 * position into page coordinates. `styleOf` lets the elements of one frame
 * share the computed styles of their ancestors.
 *
 * @internal
 */
export function readElementBox(
  element: Element,
  scrollX: number,
  scrollY: number,
  styleOf: (element: Element) => CSSStyleDeclaration,
): ElementBox | null {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const style = styleOf(element);
  return {
    x: rect.left + scrollX,
    y: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
    fixed: isFixedToViewport(element, styleOf),
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
  };
}
