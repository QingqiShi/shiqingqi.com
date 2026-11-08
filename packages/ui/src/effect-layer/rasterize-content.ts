import { EFFECT_OMIT, OMITTED } from "./effect-content.ts";
import { familiesOf, inlineFontFaces } from "./inline-font-faces.ts";

/**
 * The computed styles that make content look as it does on the page. The
 * image has no stylesheet, so each element of a copy takes these as literal
 * values.
 */
const CONTENT_STYLES = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "aspect-ratio",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "overflow-x",
  "overflow-y",
  "clip",
  "clip-path",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "order",
  "align-items",
  "align-self",
  "align-content",
  "justify-content",
  "justify-items",
  "justify-self",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-auto-flow",
  "grid-column-start",
  "grid-column-end",
  "grid-row-start",
  "grid-row-end",
  "vertical-align",
  "list-style-type",
  "list-style-position",
  "color",
  "background-color",
  "opacity",
  "visibility",
  "transform",
  "transform-origin",
  "translate",
  "scale",
  "rotate",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-stretch",
  "font-variant-caps",
  "font-variant-numeric",
  "font-variant-ligatures",
  "font-variant-east-asian",
  "font-feature-settings",
  "font-variation-settings",
  "font-optical-sizing",
  "font-kerning",
  "font-size-adjust",
  "font-synthesis-weight",
  "font-synthesis-style",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-transform",
  "text-indent",
  "text-overflow",
  "text-decoration-line",
  "text-decoration-color",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-underline-offset",
  "text-shadow",
  "text-rendering",
  "-webkit-font-smoothing",
  "white-space",
  "text-wrap-mode",
  "text-wrap-style",
  "word-break",
  "overflow-wrap",
  "hyphens",
  "direction",
  "unicode-bidi",
  "writing-mode",
  "-webkit-line-clamp",
  "-webkit-box-orient",
];

/** The `style` attribute that gives an element its computed `CONTENT_STYLES`. */
function inlineStyleOf(style: CSSStyleDeclaration) {
  let text = "";
  for (const property of CONTENT_STYLES) {
    const value = style.getPropertyValue(property);
    if (value !== "") {
      text += `${property}:${value};`;
    }
  }
  return text;
}

const NO_SURFACE =
  "background-color:transparent;border-color:transparent;box-shadow:none;outline:none;";

/**
 * A copy of `element` and of its content, each element with its computed
 * styles, and the copy of `element` also with `extraStyle`. It leaves out
 * what `EFFECT_OMIT` marks, and adds each font family that the copy uses to
 * `families`.
 */
function copyWithStyles(
  element: Element,
  families: Set<string>,
  extraStyle: string,
) {
  const copy = element.cloneNode(true);
  if (!(copy instanceof Element)) {
    throw new TypeError("An element copies to an element.");
  }
  const originals = [element, ...element.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  const omitted = new Set<Element>();
  originals.forEach((original, index) => {
    const target = copies[index];
    const parent = target.parentElement;
    if (original.matches(OMITTED) || (parent !== null && omitted.has(parent))) {
      omitted.add(target);
      return;
    }
    const style = getComputedStyle(original);
    for (const family of familiesOf(style.fontFamily)) {
      families.add(family);
    }
    target.removeAttribute("class");
    target.removeAttribute("id");
    target.setAttribute(
      "style",
      inlineStyleOf(style) +
        (original.getAttribute(EFFECT_OMIT) === "surface" ? NO_SURFACE : "") +
        (index === 0 ? extraStyle : ""),
    );
  });
  keepLineBreaks(element, copy);
  for (const target of omitted) {
    target.remove();
  }
  return copy;
}

/**
 * Puts a `<br>` in `copy` where a line of text in `element` wraps, for text
 * with a `text-wrap-style` that chooses its breaks over the whole paragraph.
 */
function keepLineBreaks(element: Element, copy: Element) {
  // WebKit ignores `text-wrap-style` in a box with `zoom`. Thus the copy
  // keeps the line breaks of the page, or the text wraps in different
  // places when an effect draws it.
  const originals = textNodesOf(element);
  const copies = textNodesOf(copy);
  const range = document.createRange();
  originals.forEach((original, index) => {
    const parent = original.parentElement;
    const text = original.data;
    if (parent === null || text.trim() === "") return;
    const wrap = getComputedStyle(parent).getPropertyValue("text-wrap-style");
    if (wrap !== "pretty" && wrap !== "balance") return;
    const topAt = (at: number) => {
      range.setStart(original, at);
      range.setEnd(original, at + 1);
      return range.getClientRects().item(0)?.top;
    };
    const breaks: number[] = [];
    let lineTop: number | undefined;
    const lineAt = (at: number) => {
      const top = topAt(at);
      if (top === undefined) return;
      if (lineTop !== undefined && top > lineTop + 1) breaks.push(at);
      lineTop = top;
    };
    for (const { segment, index: start } of WORDS.segment(text)) {
      if (segment.trim() === "") continue;
      lineAt(start);
      const end = start + segment.length - 1;
      const endTop = topAt(end);
      // A Chinese or Japanese line can wrap in a word.
      if (
        end > start &&
        endTop !== undefined &&
        lineTop !== undefined &&
        endTop > lineTop + 1
      ) {
        for (let at = start + 1; at <= end; at++) lineAt(at);
      }
    }
    const head = copies[index];
    for (const at of breaks.toReversed()) {
      head.splitText(at).before(document.createElement("br"));
    }
  });
}

const WORDS = new Intl.Segmenter(undefined, { granularity: "word" });

function textNodesOf(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) nodes.push(node);
  }
  return nodes;
}

/** The styles that put a copy of a child in its place in the image. */
const placeStyle = (left: number, top: number, width: number, height: number) =>
  `position:absolute;left:${String(left)}px;top:${String(top)}px;width:${String(width)}px;height:${String(height)}px;margin:0;box-sizing:border-box;transform:none;translate:none;scale:none;rotate:none;`;

/** @internal */
export type ContentImage = Awaited<ReturnType<typeof rasterizeContent>>;

/**
 * The border box of `root` without its own `transform`, in viewport
 * coordinates, the box with it, and the scale that the transform gives it
 * along each axis.
 */
function untransformedBox(root: Element) {
  const transformed = root.getBoundingClientRect();
  const style = getComputedStyle(root);
  if (style.transform === "none" || style.transform === "") {
    return { box: transformed, transformed, scaleX: 1, scaleY: 1 };
  }
  const { a, d, e, f } = new DOMMatrixReadOnly(style.transform);
  const [originX = 0, originY = 0] = style.transformOrigin
    .split(" ")
    .map((length) => Number.parseFloat(length));
  return {
    box: new DOMRect(
      transformed.left - originX * (1 - a) - e,
      transformed.top - originY * (1 - d) - f,
      transformed.width / a,
      transformed.height / d,
    ),
    transformed,
    scaleX: a,
    scaleY: d,
  };
}

/**
 * An image of the content of `root`, as `EFFECT_CONTENT` describes it: each
 * child of `root`, in its place in the border box of `root`, on a clear
 * ground, without the parts that `EFFECT_OMIT` marks. A child shows without
 * its own transform, and the image is in the px of `root` without its own
 * transform. It is `pixelRatio` device pixels for each CSS px. The border
 * box is `offset` CSS px from the top-left corner of the image, and `width`
 * by `height` CSS px. It rejects when the browser cannot draw it.
 *
 * @internal
 */
export async function rasterizeContent(root: Element, pixelRatio: number) {
  const { box, transformed, scaleX, scaleY } = untransformedBox(root);
  // The image starts on a whole CSS px, and the content keeps the part of a
  // px that it is off it on the page. Each engine then puts the text and the
  // boxes on pixels in the image as it does on the page.
  const left = Math.floor(box.left);
  const top = Math.floor(box.top);
  const cssWidth = Math.ceil(box.right) - left;
  const cssHeight = Math.ceil(box.bottom) - top;
  const width = Math.round(cssWidth * pixelRatio);
  const height = Math.round(cssHeight * pixelRatio);
  if (box.width <= 0 || box.height <= 0) {
    throw new RangeError("The element has no box.");
  }
  const families = new Set<string>();
  const image = document.createElement("div");
  // The language selects the fallback font of a script, such as Chinese.
  // Without it, WebKit uses a font with wider glyphs, and a label is cut.
  const lang = root.closest("[lang]")?.getAttribute("lang");
  if (lang != null) {
    image.setAttribute("lang", lang);
  }
  image.setAttribute(
    "style",
    `position:relative;margin:0;width:${String(cssWidth)}px;height:${String(cssHeight)}px;zoom:${String(pixelRatio)};`,
  );
  for (const child of root.children) {
    if (child.matches(OMITTED)) {
      continue;
    }
    const rect = child.getBoundingClientRect();
    image.append(
      copyWithStyles(
        child,
        families,
        placeStyle(
          (rect.left - transformed.left) / scaleX + box.left - left,
          (rect.top - transformed.top) / scaleY + box.top - top,
          rect.width / scaleX,
          rect.height / scaleY,
        ),
      ),
    );
  }
  const fonts = document.createElement("style");
  fonts.textContent = await inlineFontFaces(families);
  image.prepend(fonts);

  const markup = new XMLSerializer().serializeToString(image);
  // The content is laid out at the size of the device pixels, with `zoom`,
  // so that each engine puts text and boxes on device pixels, as on the
  // page. An image at CSS size that the canvas scales puts them on CSS
  // pixels in WebKit.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><foreignObject x="0" y="0" width="100%" height="100%">${markup}</foreignObject></svg>`;
  const svgImage = new Image();
  // A blob: URL taints the canvas in Chromium and WebKit, and then WebGPU
  // does not copy it. A data: URL does not taint the canvas.
  svgImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await svgImage.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("The canvas has no 2D context.");
  }
  context.drawImage(svgImage, 0, 0, width, height);
  return {
    canvas,
    width: box.width,
    height: box.height,
    offset: [box.left - left, box.top - top] as const,
    pixelRatio,
  };
}
