import { parseCssColor } from "../effect-layer/parse-css-color.ts";
import { bind, type Binding } from "./bind.ts";
import type { MotionEngine } from "./create-motion-engine.ts";
import { createMotionValue, type MotionValue } from "./create-motion-value.ts";
import { mix, smoothstep, unit } from "./mix.ts";
import type { Rect } from "./play-layout.ts";
import { px, writeStyles, type Styles } from "./px.ts";
import type { Spring } from "./spring-roles.ts";

/** Shared elements whose shapes differ more than this keep their content's shape. */
const CONTAIN_ASPECT = 1.6;
/** How far a Shared element that dips fades out at the middle of its flight. */
const DIP = 0.85;
/** How close to its target the progress of a flight is at rest. */
const REST = 2e-4;
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * The text styles that a copy takes from the element it copies, so that it
 * looks the same out of its place.
 */
const TEXT_STYLES = [
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant-numeric",
  "letter-spacing",
  "line-height",
  "text-transform",
  "direction",
] as const;

/**
 * An element that a Shared element shows in: an HTML element, or a part of
 * an SVG drawing, such as the line of a chart.
 *
 * @internal
 */
export type SharedElement = HTMLElement | SVGElement;

/**
 * One form of a Shared element as it shows now: its box, its text styles,
 * and, for a part of an SVG drawing, its box in the units of its drawing.
 *
 * @internal
 */
export interface SharedForm {
  readonly element: SharedElement;
  readonly rect: Rect;
  readonly text: readonly string[];
  readonly drawn: Rect | null;
}

/** The box of a part of an SVG drawing in the units of its drawing, or `null` for another element. */
function drawnBoxOf(element: SharedElement): Rect | null {
  if (
    !(element instanceof SVGGraphicsElement) ||
    element instanceof SVGSVGElement
  ) {
    return null;
  }
  const { x, y, width, height } = element.getBBox();
  return { x, y, width, height };
}

/**
 * The form of `element` as it shows now, with its box at `rect`.
 *
 * @internal
 */
export function readSharedForm(element: SharedElement, rect: Rect): SharedForm {
  const style = getComputedStyle(element);
  return {
    element,
    rect,
    text: TEXT_STYLES.map((property) => style.getPropertyValue(property)),
    drawn: drawnBoxOf(element),
  };
}

function mixRect(from: Rect, to: Rect, t: number): Rect {
  return {
    x: mix(from.x, to.x, t),
    y: mix(from.y, to.y, t),
    width: mix(from.width, to.width, t),
    height: mix(from.height, to.height, t),
  };
}

/**
 * The first fill that is not see-through, from `element` out.
 *
 * @internal
 */
export function opaqueFillOf(element: Element) {
  for (
    let node: Element | null = element;
    node !== null;
    node = node.parentElement
  ) {
    const fill = getComputedStyle(node).backgroundColor;
    const color = parseCssColor(fill);
    if (color !== null && color[3] > 0.99) return fill;
  }
  return "Canvas";
}

/**
 * A copy of the element of `form` in `layer`, which moves in place of the
 * element. Its box starts at the rect of `form`, in the coordinates of the
 * layer.
 *
 * @internal
 */
export function copyForMotion(form: SharedForm, layer: HTMLElement) {
  const holder = document.createElement("div");
  writeStyles(holder, {
    position: "absolute",
    left: px(form.rect.x),
    top: px(form.rect.y),
    width: px(form.rect.width),
    height: px(form.rect.height),
    "transform-origin": "0 0",
    "will-change": "transform, opacity",
  });
  TEXT_STYLES.forEach((property, index) => {
    holder.style.setProperty(property, form.text[index] ?? "");
  });
  holder.append(copyFormElement(form));
  layer.append(holder);
  return holder;
}

/** A copy of the element of `form` as it is now, at the size of its box. */
function copyFormElement(form: SharedForm): Element {
  const copy = form.element.cloneNode(true);
  if (!(copy instanceof HTMLElement || copy instanceof SVGElement)) {
    throw new TypeError("No copy");
  }
  for (const node of [copy, ...copy.querySelectorAll("[style]")]) {
    if (
      (node instanceof HTMLElement || node instanceof SVGElement) &&
      node.style.opacity === "0"
    ) {
      node.style.removeProperty("opacity");
    }
  }
  if (copy instanceof SVGElement) {
    copy.style.removeProperty("opacity");
    return drawingOf(copy, form.drawn);
  }
  writeStyles(copy, {
    margin: "0",
    "box-sizing": "border-box",
    width: px(form.rect.width),
    height: px(form.rect.height),
    transform: "none",
    opacity: "1",
  });
  return copy;
}

/**
 * An SVG drawing that holds `part`, a copy of a part of another drawing, and
 * stretches the box `drawn` of it to its own size. The lines keep their
 * width while it stretches.
 */
function drawingOf(part: SVGElement, drawn: Rect | null) {
  const svg = document.createElementNS(SVG_NS, "svg");
  if (drawn !== null) {
    svg.setAttribute(
      "viewBox",
      `${String(drawn.x)} ${String(drawn.y)} ${String(Math.max(drawn.width, 1))} ${String(Math.max(drawn.height, 1))}`,
    );
  }
  svg.setAttribute("preserveAspectRatio", "none");
  writeStyles(svg, {
    display: "block",
    width: "100%",
    height: "100%",
    overflow: "visible",
  });
  for (const node of [part, ...part.querySelectorAll("*")]) {
    if (node instanceof SVGGeometryElement) {
      node.style.setProperty("vector-effect", "non-scaling-stroke");
    }
  }
  svg.append(part);
  return svg;
}

function aspect({ width, height }: Rect) {
  return width / Math.max(height, 1);
}

/**
 * The live edge of a screen that the copies of a flight go under.
 *
 * @internal
 */
export interface FlightUnder {
  readonly progress: MotionValue;
  readonly edgeAt: (progress: number) => number;
}

/**
 * A Shared element on its way from where it showed to where it shows now:
 * a copy of each end flies in a layer over the page, and the ends wait out
 * of sight. Ends of a like shape stretch with the box and cross-fade; ends
 * of unlike shapes keep the shape of their content, and the new one shows
 * late. A part of an SVG drawing stretches its drawing, and its lines keep
 * their width.
 *
 * @internal
 */
export interface Flight<Form extends SharedForm = SharedForm> {
  readonly origin: Form;
  readonly destination: Form;
  readonly progress: MotionValue;
  /** Where the element shows now. */
  rect(): Rect;
  /** Copies the new form again where it drew its content since. */
  refresh(): void;
  isMoving(): boolean;
  /** Stops the flight and takes off every style and copy it made. */
  drop(): void;
}

/**
 * Flies a Shared element from `origin` to `destination` with `spring`,
 * after `delay` seconds, from `start`. `"cross"` cross-fades its two forms.
 * `"dip"` fades it out most of the way at the middle of its flight and back
 * in as it lands, for a label that rides along with a part that changes
 * shape. With `under`, the copies go under the edge of a screen that moves.
 *
 * @internal
 */
export function flyShared<Form extends SharedForm>(
  engine: MotionEngine,
  {
    origin,
    destination,
    layer,
    spring,
    delay = 0,
    fade = "cross",
    under = null,
    start = { value: 0, velocity: 0 },
  }: {
    origin: Form;
    destination: Form;
    layer: HTMLElement;
    spring: Spring;
    delay?: number;
    fade?: "cross" | "dip";
    under?: FlightUnder | null;
    start?: { value: number; velocity: number };
  },
): Flight<Form> {
  const progress = createMotionValue(engine, start.value, {
    spring,
    precision: REST,
  });
  progress.to(1, { delay, velocity: start.velocity });
  const ratio = aspect(origin.rect) / aspect(destination.rect);
  const contain =
    destination.drawn === null && Math.max(ratio, 1 / ratio) > CONTAIN_ASPECT;
  const dips = fade === "dip";
  const from = copyForMotion(origin, layer);
  const to = copyForMotion(destination, layer);
  origin.element.style.opacity = "0";
  destination.element.style.opacity = "0";
  // An element that has just mounted can still draw its content, such as
  // a chart that measures its width first. The copy follows it.
  let isStale = false;
  const watcher = new MutationObserver(() => {
    isStale = true;
  });
  watcher.observe(destination.element, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["d", "width", "height", "viewBox", "class"],
  });

  const opacities = (p: number): readonly [number, number] => {
    if (dips) {
      const shown = 1 - DIP * Math.sin(Math.PI * unit(p));
      const across = smoothstep(0.4, 0.6, p);
      return [shown * (1 - across), shown * across];
    }
    if (contain) {
      return [1 - smoothstep(0.15, 0.55, p), smoothstep(0.5, 1, p)];
    }
    return [1 - smoothstep(0.05, 0.55, p), smoothstep(0, 0.3, p)];
  };

  const placeOf = (copy: HTMLElement, rest: Rect, end: 0 | 1) => {
    const isDrawing = copy.firstElementChild instanceof SVGSVGElement;
    return (p: number, underProgress = 0): Styles => {
      const box = mixRect(origin.rect, destination.rect, p);
      const opacity = opacities(p)[end].toFixed(3);
      const edge = under === null ? null : under.edgeAt(underProgress);
      // Cuts the copy off at the edge of the screen that it goes under. The
      // copy starts at `left` in the layer, and a px of it is `scale` px there.
      const clip = (left: number, scale: number) =>
        edge === null
          ? ""
          : `inset(-100vmax calc(100% - ${px(Math.max(0, (edge - left) / scale))}) -100vmax -100vmax)`;
      if (isDrawing) {
        return {
          transform: `translate(${px(box.x - rest.x)}, ${px(box.y - rest.y)})`,
          width: px(box.width),
          height: px(box.height),
          opacity,
          "clip-path": clip(box.x, 1),
        };
      }
      if (contain) {
        const scale = Math.min(
          box.width / rest.width,
          box.height / rest.height,
        );
        const x = box.x + (box.width - rest.width * scale) / 2 - rest.x;
        const y = box.y + (box.height - rest.height * scale) / 2 - rest.y;
        return {
          transform: `translate(${px(x)}, ${px(y)}) scale(${scale.toFixed(4)})`,
          opacity,
          "clip-path": clip(rest.x + x, scale),
        };
      }
      const scale = box.width / rest.width;
      return {
        transform: `translate(${px(box.x - rest.x)}, ${px(box.y - rest.y)}) scale(${scale.toFixed(4)}, ${(box.height / rest.height).toFixed(4)})`,
        opacity,
        "clip-path": clip(box.x, scale),
      };
    };
  };

  const values = under === null ? [progress] : [progress, under.progress];
  const bindings: Binding[] = [
    bind(from, values, { pose: placeOf(from, origin.rect, 0) }),
    bind(to, values, { pose: placeOf(to, destination.rect, 1) }),
  ];

  return {
    origin,
    destination,
    progress,
    rect: () => mixRect(origin.rect, destination.rect, progress.get()),
    refresh() {
      if (!isStale) return;
      isStale = false;
      to.replaceChildren(copyFormElement(destination));
    },
    isMoving: () => progress.isMoving,
    drop() {
      for (const binding of bindings) binding.unbind();
      progress.stop();
      watcher.disconnect();
      from.remove();
      to.remove();
      origin.element.style.removeProperty("opacity");
      destination.element.style.removeProperty("opacity");
    },
  };
}
