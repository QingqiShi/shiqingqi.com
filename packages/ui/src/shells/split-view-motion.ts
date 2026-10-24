import { isDarkBackground } from "../effect-layer/dust-color.ts";
import { parseCssColor } from "../effect-layer/parse-css-color.ts";
import { readPageBackdrop } from "../effect-layer/plan-scopes.ts";
import { isRendered } from "../focus/is-rendered.ts";
import { prefersReducedMotion } from "../prefers-reduced-motion.ts";
import { mix, smoothstep, Spring, unit, type SpringConfig } from "../spring.ts";

/**
 * The springs of the motion of a `NavigationSplitView`.
 *
 * @internal
 */
export const SPLIT_VIEW_SPRINGS = {
  /** A column that comes in beside the others, with a little overshoot. */
  columnPush: { response: 0.56, damping: 0.7 },
  /** A screen that comes in over the one under it, on a phone. */
  stackPush: { response: 0.5, damping: 1 },
  /** The sidebar that folds to the Collapsed sidebar and back. */
  fold: { response: 0.5, damping: 0.88 },
  /** A Shared element on its way from one place to the other. */
  flight: { response: 0.46, damping: 0.8 },
  /** An element that the new composition moves. */
  move: { response: 0.42, damping: 0.9 },
} as const satisfies Record<string, SpringConfig>;

/** How long a cross-fade takes, in seconds, under reduced motion and where a column only changes. */
const CROSS_FADE = 0.17;
/** The time, in seconds, between two Shared elements that set off. */
const STAGGER = { fold: 0.016, other: 0.0096 } as const;
/** How far the screen under a new one moves back, as a share of its width. */
const PARALLAX = { columns: 0.28, stacked: 0.3 } as const;
/** How dark the screen under a new one gets. */
const DIM = {
  columns: { light: 0.07, dark: 0.21 },
  stacked: { light: 0.1, dark: 0.5 },
} as const;
/** The opacity of `color.bgScrim`, which the dim layer paints. */
const SCRIM_OPACITY = 0.7;
/** How far, in px, the text of the folding sidebar drifts towards the strip. */
const FOLD_DRIFT = 22;
/** Shared elements whose shapes differ more than this keep their content's shape. */
const CONTAIN_ASPECT = 1.6;
/** The longest frame, in seconds, that the springs step over at once. */
const MAX_FRAME = 1 / 30;
/** How far a Shared element that dips fades out at the middle of its flight. */
const DIP = 0.85;
/** Where on its way the rest of a Shared element that holds others starts to show. */
const LATE_FROM = 0.7;
/** How long, in seconds, a Shared element that holds others waits for the new form to draw them. */
const PART_WAIT = 0.25;
const SVG_NS = "http://www.w3.org/2000/svg";

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

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * An element that a Shared element shows in: an HTML element, or a part of
 * an SVG drawing, such as the line of a chart.
 *
 * @internal
 */
export type SplitViewMarkElement = HTMLElement | SVGElement;

/**
 * How a Shared element flies.
 *
 * @internal
 */
export interface SplitViewFlightOptions {
  /**
   * `"cross"` cross-fades its two forms. `"dip"` fades it out most of the
   * way at the middle of its flight and back in as it lands, for a label
   * that rides along with a part that changes shape, such as the value at
   * the top of a chart.
   */
  readonly fade?: "cross" | "dip";
}

/**
 * What changed in a composition of the view, as the URL tells it.
 *
 * @internal
 */
export interface SplitViewChange {
  /** The content went one column deeper, came back one, or showed other content at the same depth. */
  readonly content: "push" | "pop" | "swap" | null;
  /** The detail came, went, or showed other content. */
  readonly detail: "in" | "out" | "swap" | null;
}

/**
 * Where each Shared element shows before a change, read when a navigation
 * is about to change the DOM.
 *
 * @internal
 */
export interface SplitViewSnapshot {
  readonly marks: ReadonlyMap<string, ShownMark>;
  readonly contentLeft: number | null;
  readonly sidebar: "full" | "collapsed" | null;
}

interface ShownMark {
  readonly element: SplitViewMarkElement;
  readonly rect: Rect;
  readonly text: readonly string[];
  readonly options: SplitViewFlightOptions;
  /** The box of a part of an SVG drawing, in the units of its drawing. */
  readonly drawn: Rect | null;
}

/** The box of a part of an SVG drawing in the units of its drawing, or `null` for another element. */
function drawnBoxOf(element: SplitViewMarkElement): Rect | null {
  if (
    !(element instanceof SVGGraphicsElement) ||
    element instanceof SVGSVGElement
  ) {
    return null;
  }
  const { x, y, width, height } = element.getBBox();
  return { x, y, width, height };
}

/** Where `element` shows now, as `ShownMark` keeps it. */
function markOf(
  element: SplitViewMarkElement,
  rect: Rect,
  options: SplitViewFlightOptions,
): ShownMark {
  const style = getComputedStyle(element);
  return {
    element,
    rect,
    text: TEXT_STYLES.map((property) => style.getPropertyValue(property)),
    options,
    drawn: drawnBoxOf(element),
  };
}

/**
 * What the view does when the motion ends, and the paint it lends the
 * motion.
 *
 * @internal
 */
export interface SplitViewMotionEvents {
  /** The `box-shadow` that draws the seam at the content column's inline start while it moves. */
  readonly seam: string;
  /** Every motion up to `motion`, the one that played last, has stopped, so the view can let go of what left. */
  onSettled: (motion: number) => void;
  /** The sidebar starts or stops folding: its links shed dust into the links of the other form. */
  onFold: (fold: "fold" | "unfold" | null) => void;
  /** The motion has drawn a frame, so the Shared elements show at other places. */
  onFrame: () => void;
}

const NOTHING_SHOWN: SplitViewSnapshot = {
  marks: new Map(),
  contentLeft: null,
  sidebar: null,
};

interface Track {
  /** Moves on by `seconds`. False once it has stopped. */
  step: (seconds: number) => boolean;
  /** Writes the styles of now. */
  render: () => void;
  /** Takes off the transforms it wrote, so that a measure reads the layout. */
  unpose: () => void;
  /** Takes off every style it wrote. */
  finish: () => void;
}

function relativeRect(element: Element, origin: DOMRect): Rect {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - origin.left,
    y: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
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

function isShown(element: Element) {
  if (!element.isConnected) return false;
  if (element.closest("[data-split-view-leaving]") !== null) return false;
  const visible =
    typeof element.checkVisibility === "function"
      ? element.checkVisibility({ visibilityProperty: true })
      : isRendered(element, { visibilityProperty: true });
  if (!visible) return false;
  const { width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0;
}

function px(value: number) {
  return `${value.toFixed(2)}px`;
}

/** The first fill that is not see-through, from `element` out. */
function backdropOf(element: Element) {
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

/** Whether `fill`, a fill from `backdropOf`, is dark. */
function isDark(fill: string) {
  const color = parseCssColor(fill);
  return isDarkBackground(
    color !== null && color[3] > 0.99 ? color : readPageBackdrop(),
  );
}

function setStyle(
  element: SplitViewMarkElement,
  styles: Partial<Record<string, string>>,
) {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value ?? "");
  }
}

function dimOf(page: HTMLElement) {
  return page.querySelector<HTMLElement>(":scope > [data-split-view-dim]");
}

function edgeOf(element: HTMLElement) {
  return element.querySelector<HTMLElement>(":scope > [data-split-view-edge]");
}

/** The opacity of a soft edge shadow while its column moves. */
function edgeOpacity(progress: number) {
  return Math.min(1, Math.sin(Math.PI * unit(progress)) * 1.4).toFixed(3);
}

/**
 * The screen under a new one and the new one: the new one comes in from the
 * inline end over the one under it, which moves back a little and dims.
 * `progress` is 1 where the new one is in.
 */
class PushTrack implements Track {
  readonly spring: Spring;

  back: HTMLElement | null;
  front: HTMLElement;
  private left: number;
  private width: number;
  private presentation: "columns" | "stacked";
  private dark: boolean;
  private fill: string;

  constructor(
    back: HTMLElement | null,
    front: HTMLElement,
    { x, width }: Rect,
    presentation: "columns" | "stacked",
    fill: string,
    progress: number,
  ) {
    this.back = back;
    this.front = front;
    this.left = x;
    this.width = width;
    this.presentation = presentation;
    this.dark = isDark(fill);
    this.fill = fill;
    this.spring = new Spring(
      progress,
      presentation === "columns"
        ? SPLIT_VIEW_SPRINGS.columnPush
        : SPLIT_VIEW_SPRINGS.stackPush,
    );
  }

  /** Where the inline-start edge of the new screen is now, from the view's. */
  get edge() {
    return this.left + this.width * (1 - this.spring.value);
  }

  step(seconds: number) {
    this.spring.step(seconds);
    return this.spring.isMoving;
  }

  render() {
    const progress = this.spring.value;
    const shown = unit(progress);
    if (this.back !== null) {
      const back = this.back;
      setStyle(back, {
        transform: `translateX(${px(-PARALLAX[this.presentation] * this.width * shown)})`,
        visibility: shown >= 0.999 ? "" : "visible",
        "content-visibility": shown >= 0.999 ? "" : "visible",
        "background-color": this.fill,
      });
      const dim = dimOf(back);
      const strength = DIM[this.presentation][this.dark ? "dark" : "light"];
      if (dim !== null) {
        dim.style.opacity = ((shown * strength) / SCRIM_OPACITY).toFixed(3);
      }
    }
    setStyle(this.front, {
      transform: `translateX(${px(this.width * (1 - progress))})`,
      visibility: progress <= 0.001 ? "hidden" : "visible",
      "content-visibility": "visible",
      "background-color": this.fill,
    });
    const edge = edgeOf(this.front);
    if (edge !== null) edge.style.opacity = edgeOpacity(progress);
  }

  unpose() {
    this.back?.style.removeProperty("transform");
    this.front.style.removeProperty("transform");
  }

  finish() {
    for (const page of [this.back, this.front]) {
      if (page === null) continue;
      setStyle(page, {
        transform: "",
        visibility: "",
        "content-visibility": "",
        "background-color": "",
      });
      const dim = dimOf(page);
      if (dim !== null) dim.style.opacity = "";
      const edge = edgeOf(page);
      if (edge !== null) edge.style.opacity = "";
    }
  }
}

/** The detail column, which comes in from the inline end and goes back there. */
class DetailTrack implements Track {
  readonly spring: Spring;

  readonly column: HTMLElement;
  private width: number;
  private fill: string;

  constructor(column: HTMLElement, width: number, progress: number) {
    this.column = column;
    this.width = width;
    this.fill = backdropOf(column);
    this.spring = new Spring(progress, SPLIT_VIEW_SPRINGS.columnPush);
  }

  go(target: 0 | 1) {
    this.spring.to(target);
  }

  step(seconds: number) {
    this.spring.step(seconds);
    return this.spring.isMoving;
  }

  render() {
    const progress = this.spring.value;
    setStyle(this.column, {
      transform: `translateX(${px(this.width * (1 - progress))})`,
      visibility: progress <= 0.001 ? "hidden" : "visible",
      "background-color": this.fill,
    });
    const edge = edgeOf(this.column);
    if (edge !== null) edge.style.opacity = edgeOpacity(progress);
  }

  unpose() {
    this.column.style.removeProperty("transform");
  }

  finish() {
    setStyle(this.column, {
      transform: "",
      visibility: "",
      "background-color": "",
    });
    const edge = edgeOf(this.column);
    if (edge !== null) edge.style.opacity = "";
  }
}

/** An element that the new composition moved, which springs from its old place to its new one. */
class OffsetTrack implements Track {
  readonly x: Spring;
  readonly y: Spring;

  readonly element: SplitViewMarkElement;
  private styles: Partial<Record<string, string>>;

  constructor(
    element: SplitViewMarkElement,
    config: SpringConfig,
    dx: number,
    dy: number,
    styles: Partial<Record<string, string>> = {},
  ) {
    this.element = element;
    this.styles = styles;
    this.x = new Spring(dx, config).to(0);
    this.y = new Spring(dy, config).to(0);
  }

  step(seconds: number) {
    this.x.step(seconds);
    this.y.step(seconds);
    return this.x.isMoving || this.y.isMoving;
  }

  render() {
    setStyle(this.element, {
      ...this.styles,
      transform: `translate(${px(this.x.value)}, ${px(this.y.value)})`,
    });
  }

  unpose() {
    this.element.style.removeProperty("transform");
  }

  finish() {
    const cleared = Object.fromEntries(
      Object.keys(this.styles).map((property) => [property, ""]),
    );
    setStyle(this.element, { ...cleared, transform: "" });
  }
}

/**
 * The two forms of the sidebar while it folds: the full sidebar fades and
 * drifts towards the strip, and the Collapsed sidebar fades in late, as its
 * Shared elements land. `progress` is 1 where the sidebar is folded.
 */
class FoldTrack implements Track {
  readonly spring: Spring;

  private full: HTMLElement;
  private collapsed: HTMLElement;

  constructor(full: HTMLElement, collapsed: HTMLElement, progress: number) {
    this.full = full;
    this.collapsed = collapsed;
    this.spring = new Spring(progress, SPLIT_VIEW_SPRINGS.fold);
  }

  step(seconds: number) {
    this.spring.step(seconds);
    return this.spring.isMoving;
  }

  render() {
    const folded = this.spring.value;
    const towardsFolded = this.spring.destination === 1;
    for (const [form, opacity] of [
      [this.full, 1 - smoothstep(0, 0.35, folded)],
      [this.collapsed, smoothstep(0.55, 1, folded)],
    ] as const) {
      const leaving = towardsFolded === (form === this.full);
      setStyle(form, {
        visibility: "visible",
        opacity: opacity.toFixed(3),
      });
      form.toggleAttribute("data-split-view-leaving", leaving);
    }
    this.full.style.transform = `translateX(${px(-FOLD_DRIFT * unit(folded * 3))})`;
  }

  unpose() {
    this.full.style.removeProperty("transform");
  }

  finish() {
    for (const form of [this.full, this.collapsed]) {
      setStyle(form, { visibility: "", opacity: "", transform: "" });
      form.removeAttribute("data-split-view-leaving");
    }
  }
}

/** A fade of an element over `CROSS_FADE` seconds, out over what replaced it, or in. */
class FadeTrack implements Track {
  private elapsed = 0;

  readonly element: HTMLElement;
  private direction: "in" | "out";

  constructor(element: HTMLElement, direction: "in" | "out") {
    this.element = element;
    this.direction = direction;
  }

  step(seconds: number) {
    this.elapsed += seconds;
    return this.elapsed < CROSS_FADE;
  }

  render() {
    const shown = unit(this.elapsed / CROSS_FADE);
    const out = this.direction === "out";
    setStyle(this.element, {
      opacity: (out ? 1 - shown : shown).toFixed(3),
      "z-index": out ? "2" : "",
      visibility: out ? "visible" : "",
      "content-visibility": out ? "visible" : "",
    });
  }

  unpose() {}

  finish() {
    setStyle(this.element, {
      opacity: "",
      "z-index": "",
      visibility: "",
      "content-visibility": "",
      transform: "",
      "background-color": "",
    });
  }
}

/**
 * A copy of an element in the layer over the view, which flies in place of
 * the element. Its box starts at `rect`.
 */
function copyOf(mark: ShownMark, layer: HTMLElement) {
  const holder = document.createElement("div");
  setStyle(holder, {
    position: "absolute",
    left: px(mark.rect.x),
    top: px(mark.rect.y),
    width: px(mark.rect.width),
    height: px(mark.rect.height),
    "transform-origin": "0 0",
    "will-change": "transform, opacity",
  });
  TEXT_STYLES.forEach((property, index) => {
    holder.style.setProperty(property, mark.text[index] ?? "");
  });
  holder.append(copyElement(mark));
  layer.append(holder);
  return holder;
}

/** A copy of the element of `mark` as it is now, at the size of its box. */
function copyElement(mark: ShownMark): Element {
  const copy = mark.element.cloneNode(true);
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
    return drawingOf(copy, mark.drawn);
  }
  setStyle(copy, {
    margin: "0",
    "box-sizing": "border-box",
    width: px(mark.rect.width),
    height: px(mark.rect.height),
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
  setStyle(svg, {
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
 * A Shared element on its way from where it showed to where it shows now:
 * a copy of each end flies in the layer over the view, and the ends wait
 * out of sight. Ends of a like shape stretch with the box and cross-fade;
 * ends of unlike shapes keep the shape of their content, and the new one
 * shows late. A part of an SVG drawing stretches its drawing, and its
 * lines keep their width.
 */
class Flight implements Track {
  readonly spring: Spring;
  private readonly from: HTMLElement;
  private readonly to: HTMLElement;
  private readonly contain: boolean;
  private readonly dips: boolean;
  /** The inline-start edge of a screen that the copies go under, or `null`. */
  private readonly under: (() => number) | null;
  private readonly watcher: MutationObserver;
  private isStale = false;

  readonly name: string;
  readonly origin: ShownMark;
  readonly destination: ShownMark;

  constructor(
    name: string,
    origin: ShownMark,
    destination: ShownMark,
    layer: HTMLElement,
    delay: number,
    config: SpringConfig,
    under: (() => number) | null,
    progress = 0,
    velocity = 0,
  ) {
    this.name = name;
    this.under = under;
    this.origin = origin;
    this.destination = destination;
    this.spring = new Spring(progress, config).to(1, {
      delay,
      velocity,
    });
    const ratio = aspect(origin.rect) / aspect(destination.rect);
    this.contain =
      destination.drawn === null && Math.max(ratio, 1 / ratio) > CONTAIN_ASPECT;
    this.dips = destination.options.fade === "dip";
    this.from = copyOf(origin, layer);
    this.to = copyOf(destination, layer);
    origin.element.style.opacity = "0";
    destination.element.style.opacity = "0";
    // An element that has just mounted can still draw its content, such as
    // a chart that measures its width first. The copy follows it.
    this.watcher = new MutationObserver(() => {
      this.isStale = true;
    });
    this.watcher.observe(destination.element, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["d", "width", "height", "viewBox", "class"],
    });
  }

  /** Where the element shows now. */
  get rect() {
    return mixRect(this.origin.rect, this.destination.rect, this.spring.value);
  }

  step(seconds: number) {
    this.spring.step(seconds);
    return this.spring.isMoving;
  }

  render() {
    if (this.isStale) {
      this.isStale = false;
      this.to.replaceChildren(copyElement(this.destination));
    }
    const progress = this.spring.value;
    const box = this.rect;
    const edge = this.under?.() ?? null;
    // Cuts the copy off at the edge of the screen that it goes under. The
    // copy starts at `left` in the view, and a px of it is `scale` px there.
    const clip = (left: number, scale: number) =>
      edge === null
        ? ""
        : `inset(-100vmax calc(100% - ${px(Math.max(0, (edge - left) / scale))}) -100vmax -100vmax)`;
    const place = (copy: HTMLElement, rest: Rect, opacity: number) => {
      let transform: string;
      let cut: string;
      if (copy.firstElementChild instanceof SVGSVGElement) {
        setStyle(copy, {
          transform: `translate(${px(box.x - rest.x)}, ${px(box.y - rest.y)})`,
          width: px(box.width),
          height: px(box.height),
          opacity: opacity.toFixed(3),
          "clip-path": clip(box.x, 1),
        });
        return;
      }
      if (this.contain) {
        const scale = Math.min(
          box.width / rest.width,
          box.height / rest.height,
        );
        const x = box.x + (box.width - rest.width * scale) / 2 - rest.x;
        const y = box.y + (box.height - rest.height * scale) / 2 - rest.y;
        transform = `translate(${px(x)}, ${px(y)}) scale(${scale.toFixed(4)})`;
        cut = clip(rest.x + x, scale);
      } else {
        const scale = box.width / rest.width;
        transform = `translate(${px(box.x - rest.x)}, ${px(box.y - rest.y)}) scale(${scale.toFixed(4)}, ${(box.height / rest.height).toFixed(4)})`;
        cut = clip(box.x, scale);
      }
      setStyle(copy, {
        transform,
        opacity: opacity.toFixed(3),
        "clip-path": cut,
      });
    };
    if (this.dips) {
      const shown = 1 - DIP * Math.sin(Math.PI * unit(progress));
      const across = smoothstep(0.4, 0.6, progress);
      place(this.from, this.origin.rect, shown * (1 - across));
      place(this.to, this.destination.rect, shown * across);
    } else if (this.contain) {
      place(this.from, this.origin.rect, 1 - smoothstep(0.15, 0.55, progress));
      place(this.to, this.destination.rect, smoothstep(0.5, 1, progress));
    } else {
      place(this.from, this.origin.rect, 1 - smoothstep(0.05, 0.55, progress));
      place(this.to, this.destination.rect, smoothstep(0, 0.3, progress));
    }
  }

  unpose() {}

  finish() {
    this.watcher.disconnect();
    this.from.remove();
    this.to.remove();
    this.origin.element.style.removeProperty("opacity");
    this.destination.element.style.removeProperty("opacity");
  }
}

interface WaitingPart {
  readonly name: string;
  readonly from: ShownMark;
}

/**
 * A Shared element that holds others, such as a chart that holds its line
 * and its labels: the ones it holds fly on their own, the form it leaves
 * stays where it is, and the rest of the form it goes to shows only as
 * they land. A new form can draw what it holds a moment after it mounts,
 * such as a chart that measures its width first, so the motion waits for
 * the parts that it has not drawn yet, and they set off together.
 */
class HolderTrack implements Track {
  readonly spring: Spring;
  private waiting: WaitingPart[];
  private age = 0;

  readonly name: string;
  readonly origin: ShownMark;
  readonly destination: ShownMark;

  constructor(
    name: string,
    origin: ShownMark,
    destination: ShownMark,
    waiting: WaitingPart[],
  ) {
    this.name = name;
    this.origin = origin;
    this.destination = destination;
    this.waiting = waiting;
    this.spring = new Spring(0, SPLIT_VIEW_SPRINGS.move).to(1);
  }

  get isWaiting() {
    return this.waiting.length > 0;
  }

  /** The waiting parts that `find` finds in the new form now, which stop waiting. */
  land(find: (name: string, within: Element) => ShownMark | null) {
    const landed: { name: string; from: ShownMark; to: ShownMark }[] = [];
    this.waiting = this.waiting.filter(({ name, from }) => {
      const to = find(name, this.destination.element);
      if (to === null) return true;
      landed.push({ name, from, to });
      return false;
    });
    return landed;
  }

  step(seconds: number) {
    this.age += seconds;
    if (this.age > PART_WAIT) this.waiting = [];
    if (this.isWaiting) return true;
    this.spring.step(seconds);
    return this.spring.isMoving;
  }

  render() {
    this.destination.element.style.opacity = smoothstep(
      LATE_FROM,
      1,
      this.spring.value,
    ).toFixed(3);
  }

  unpose() {}

  finish() {
    this.destination.element.style.removeProperty("opacity");
  }
}

/**
 * The elements that each Shared element shows in, by name, with how each
 * flies.
 *
 * @internal
 */
export type SplitViewMarks = Map<
  string,
  Map<SplitViewMarkElement, SplitViewFlightOptions>
>;

/**
 * Adds an element that the Shared element `name` shows in, and gives the
 * cleanup that takes it off.
 *
 * @internal
 */
export function addSplitViewMark(
  marks: SplitViewMarks,
  name: string,
  element: SplitViewMarkElement,
  options: SplitViewFlightOptions = {},
) {
  let elements = marks.get(name);
  if (elements === undefined) {
    elements = new Map();
    marks.set(name, elements);
  }
  elements.set(element, options);
  return () => {
    elements.delete(element);
    if (elements.size === 0 && marks.get(name) === elements) {
      marks.delete(name);
    }
  };
}

/** The data attributes that tell the motion which element is which. */
const SELECTOR = {
  content: ':scope [data-split-view-column="content"]',
  detail: ':scope [data-split-view-column="detail"]',
  fullSidebar: ':scope [data-split-view-sidebar="full"]',
  collapsedSidebar: ':scope [data-split-view-sidebar="collapsed"]',
  page: (role: "under" | "current" | "leaving") =>
    `:scope > [data-split-view-pages] > [data-split-view-page="${role}"]`,
} as const;

/**
 * The motion of a `NavigationSplitView`: the springs, the tracks that they
 * drive, and the Shared elements. The view reads a snapshot when a
 * navigation is about to change the composition, and plays the change after
 * it. A change that comes
 * while a motion runs turns each part from where it is, at the speed it has.
 * The motion writes only `transform`, `opacity` and `visibility`, once a
 * frame, and reads the layout only when a change starts.
 *
 * @internal
 */
export class SplitViewMotion {
  private push: PushTrack | null = null;
  private detail: DetailTrack | null = null;
  private offset: OffsetTrack | null = null;
  private fold: FoldTrack | null = null;
  private fades: FadeTrack[] = [];
  private flights = new Map<string, Flight>();
  private holders: HolderTrack[] = [];
  private moves = new Map<SplitViewMarkElement, OffsetTrack>();
  private frame = 0;
  private last = 0;
  private folding: "fold" | "unfold" | null = null;
  private foldTimer: ReturnType<typeof setTimeout> | undefined;
  private played = 0;
  /** A swipe let go to go back holds the screen out until the view pops it. */
  private awaitingPop: ReturnType<typeof setTimeout> | undefined;

  private readonly view: HTMLElement;
  private readonly layer: HTMLElement;
  private readonly marks: SplitViewMarks;
  private readonly events: SplitViewMotionEvents;

  constructor(
    view: HTMLElement,
    layer: HTMLElement,
    marks: SplitViewMarks,
    events: SplitViewMotionEvents,
  ) {
    this.view = view;
    this.layer = layer;
    this.marks = marks;
    this.events = events;
  }

  /** Reads where each Shared element shows now, as the screen shows it. */
  capture(): SplitViewSnapshot {
    const origin = this.view.getBoundingClientRect();
    const marks = new Map<string, ShownMark>();
    for (const [name, elements] of this.marks) {
      const flight = this.flights.get(name);
      const shown = [...elements].filter(([element]) => isShown(element));
      if (shown.length !== 1) continue;
      const [[element, options]] = shown;
      marks.set(
        name,
        markOf(
          element,
          flight !== undefined && flight.destination.element === element
            ? flight.rect
            : relativeRect(element, origin),
          options,
        ),
      );
    }
    const content = this.view.querySelector(SELECTOR.content);
    return {
      marks,
      contentLeft:
        content === null ? null : content.getBoundingClientRect().left,
      sidebar: this.sidebarShown(),
    };
  }

  /**
   * Plays the change from `before` to the composition in the DOM now, as
   * motion number `motion`. Without a snapshot, the columns and the pages
   * move, but no Shared element flies, the sidebar does not fold and the
   * content does not slide to its new place.
   */
  play(
    snapshot: SplitViewSnapshot | null,
    change: SplitViewChange,
    motion: number,
  ) {
    const before = snapshot ?? NOTHING_SHOWN;
    this.played = motion;
    if (change.content !== null) this.stopAwaitingPop();
    const reduced = prefersReducedMotion();
    for (const track of this.tracks()) track.unpose();
    const origin = this.view.getBoundingClientRect();
    const rem =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16;
    const presentation = origin.width / rem < 30 ? "stacked" : "columns";
    const sidebar = this.sidebarShown();
    const fold =
      before.sidebar === "full" && sidebar === "collapsed"
        ? "fold"
        : before.sidebar === "collapsed" && sidebar === "full"
          ? "unfold"
          : null;

    if (reduced) {
      this.stopAll();
      this.playReduced(change);
    } else {
      this.playContent(change.content, presentation);
      this.playDetail(change.detail);
      this.playOffset(before.contentLeft);
      this.playFold(fold);
      this.playMarks(before, origin, fold);
    }
    this.render();
    this.start();
  }

  /**
   * Starts a swipe back over the content, which `drag` moves and `release`
   * ends. False where there is no screen to swipe.
   */
  beginSwipe() {
    const content = this.view.querySelector<HTMLElement>(SELECTOR.content);
    const front = content?.querySelector<HTMLElement>(SELECTOR.page("current"));
    if (content == null || front == null) return false;
    const back = content.querySelector<HTMLElement>(SELECTOR.page("under"));
    if (this.push === null || this.push.front !== front) {
      this.push?.finish();
      this.push = new PushTrack(
        back,
        front,
        relativeRect(content, this.view.getBoundingClientRect()),
        "stacked",
        backdropOf(content),
        1,
      );
    }
    this.push.spring.snap(this.push.spring.value);
    this.render();
    return true;
  }

  /** Puts the swiped screen `progress` of the way in. */
  drag(progress: number) {
    this.push?.spring.snap(progress);
    this.render();
    this.events.onFrame();
  }

  /** Lets go of a swipe: the screen goes out where `pop`, and back in else, at `velocity` of progress a second. */
  release(pop: boolean, velocity: number) {
    if (this.push === null) return;
    if (prefersReducedMotion()) {
      this.push.spring.snap(pop ? 0 : 1);
      if (pop) this.fades.push(new FadeTrack(this.push.front, "out"));
    } else {
      this.push.spring.to(pop ? 0 : 1, { velocity });
    }
    if (pop) {
      clearTimeout(this.awaitingPop);
      this.awaitingPop = setTimeout(() => {
        this.stopAwaitingPop();
      }, 4000);
    }
    this.start();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.foldTimer);
    clearTimeout(this.awaitingPop);
    this.stopAll();
  }

  private stopAwaitingPop() {
    if (this.awaitingPop === undefined) return;
    clearTimeout(this.awaitingPop);
    this.awaitingPop = undefined;
    if (this.push !== null && !this.push.spring.isMoving) this.drop(this.push);
  }

  private sidebarShown() {
    const full = this.view.querySelector(SELECTOR.fullSidebar);
    const collapsed = this.view.querySelector(SELECTOR.collapsedSidebar);
    if (full !== null && isShown(full)) return "full";
    if (collapsed !== null && isShown(collapsed)) return "collapsed";
    return null;
  }

  private playReduced(change: SplitViewChange) {
    const content = this.view.querySelector<HTMLElement>(SELECTOR.content);
    const detail = this.view.querySelector<HTMLElement>(SELECTOR.detail);
    const fadeOut = (element: HTMLElement | null | undefined) => {
      if (element != null) this.fades.push(new FadeTrack(element, "out"));
    };
    if (change.content === "push") {
      fadeOut(content?.querySelector<HTMLElement>(SELECTOR.page("under")));
    } else if (change.content !== null) {
      fadeOut(content?.querySelector<HTMLElement>(SELECTOR.page("leaving")));
    }
    if (change.detail === "in" && detail !== null) {
      this.fades.push(new FadeTrack(detail, "in"));
    } else if (change.detail === "out") {
      fadeOut(detail);
    } else if (change.detail === "swap") {
      fadeOut(detail?.querySelector<HTMLElement>(SELECTOR.page("leaving")));
    }
  }

  private playContent(
    kind: SplitViewChange["content"],
    presentation: "columns" | "stacked",
  ) {
    if (kind === null) return;
    const content = this.view.querySelector<HTMLElement>(SELECTOR.content);
    if (content === null) return;
    const under = content.querySelector<HTMLElement>(SELECTOR.page("under"));
    const current = content.querySelector<HTMLElement>(
      SELECTOR.page("current"),
    );
    const leaving = content.querySelector<HTMLElement>(
      SELECTOR.page("leaving"),
    );
    if (current === null) return;
    if (kind === "swap") {
      if (leaving === null) return;
      if (this.push?.front === leaving) {
        this.push.front = current;
      }
      this.fades.push(new FadeTrack(leaving, "out"));
      return;
    }
    const back = kind === "push" ? under : current;
    const front = kind === "push" ? current : leaving;
    if (front === null) return;
    const push = this.push;
    if (
      push !== null &&
      push.front === front &&
      (push.back === back || push.back === null)
    ) {
      push.back = back;
    } else {
      push?.finish();
      this.push = new PushTrack(
        back,
        front,
        relativeRect(content, this.view.getBoundingClientRect()),
        presentation,
        backdropOf(content),
        kind === "push" ? 0 : 1,
      );
    }
    this.push?.spring.to(kind === "push" ? 1 : 0);
  }

  private playDetail(kind: SplitViewChange["detail"]) {
    if (kind === null) return;
    const column = this.view.querySelector<HTMLElement>(SELECTOR.detail);
    if (column === null) return;
    if (kind === "swap") {
      const leaving = column.querySelector<HTMLElement>(
        SELECTOR.page("leaving"),
      );
      if (leaving !== null) this.fades.push(new FadeTrack(leaving, "out"));
      return;
    }
    if (this.detail === null || this.detail.column !== column) {
      this.detail?.finish();
      this.detail = new DetailTrack(
        column,
        column.getBoundingClientRect().width,
        kind === "in" ? 0 : 1,
      );
    }
    this.detail.go(kind === "in" ? 1 : 0);
  }

  private playOffset(before: number | null) {
    const content = this.view.querySelector<HTMLElement>(SELECTOR.content);
    if (content === null || before === null) return;
    const dx = before - content.getBoundingClientRect().left;
    const velocity = this.offset?.x.velocity ?? 0;
    this.offset?.finish();
    this.offset = null;
    if (Math.abs(dx) < 0.5) return;
    this.offset = new OffsetTrack(content, SPLIT_VIEW_SPRINGS.fold, dx, 0, {
      "z-index": "1",
      "background-color": backdropOf(content),
      "box-shadow": this.events.seam,
    });
    this.offset.x.velocity = velocity;
  }

  private playFold(fold: "fold" | "unfold" | null) {
    if (fold === null) return;
    const full = this.view.querySelector<HTMLElement>(SELECTOR.fullSidebar);
    const collapsed = this.view.querySelector<HTMLElement>(
      SELECTOR.collapsedSidebar,
    );
    if (full === null || collapsed === null) return;
    this.fold ??= new FoldTrack(full, collapsed, fold === "fold" ? 0 : 1);
    this.fold.spring.to(fold === "fold" ? 1 : 0, {
      delay: fold === "unfold" ? 0.04 : 0,
    });
    this.setFolding(fold);
  }

  private playMarks(
    before: SplitViewSnapshot,
    origin: DOMRect,
    fold: "fold" | "unfold" | null,
  ) {
    const after = new Map<string, ShownMark>();
    for (const [name, elements] of this.marks) {
      const shown = [...elements].filter(([element]) => isShown(element));
      if (shown.length !== 1) continue;
      const [[element, options]] = shown;
      after.set(name, markOf(element, relativeRect(element, origin), options));
    }

    const paired: { name: string; from: ShownMark; to: ShownMark }[] = [];
    const moved = new Map<SplitViewMarkElement, { dx: number; dy: number }>();
    for (const [name, to] of after) {
      const from = before.marks.get(name);
      if (from === undefined) continue;
      if (from.element === to.element) {
        const dx = from.rect.x - to.rect.x;
        const dy = from.rect.y - to.rect.y;
        if (Math.hypot(dx, dy) >= 0.5) moved.set(to.element, { dx, dy });
      } else {
        paired.push({ name, from, to });
      }
    }
    const holds = (outer: ShownMark, inner: ShownMark) =>
      outer.element !== inner.element && outer.element.contains(inner.element);
    const waitingIn = ({ from }: (typeof paired)[number]) =>
      [...before.marks]
        .filter(([name, mark]) => !after.has(name) && holds(from, mark))
        .map(([name, mark]) => ({ name, from: mark }));
    const isHolder = (pair: (typeof paired)[number]) =>
      paired.some(
        (other) => holds(pair.from, other.from) || holds(pair.to, other.to),
      ) || waitingIn(pair).length > 0;
    const isPart = ({ from, to }: (typeof paired)[number]) =>
      paired.some((other) => holds(other.from, from) || holds(other.to, to));
    const pairs = paired.filter((pair) => !isHolder(pair));
    for (const holder of this.holders) holder.finish();
    this.holders = paired
      .filter(isHolder)
      .map(
        (pair) =>
          new HolderTrack(pair.name, pair.from, pair.to, waitingIn(pair)),
      );

    for (const [element, { dx, dy }] of moved) {
      const outer = [...moved.entries()].find(
        ([other]) => other !== element && other.contains(element),
      );
      const ownX = dx - (outer?.[1].dx ?? 0);
      const ownY = dy - (outer?.[1].dy ?? 0);
      this.moves.get(element)?.finish();
      this.moves.delete(element);
      if (Math.hypot(ownX, ownY) < 0.5) continue;
      this.moves.set(
        element,
        new OffsetTrack(element, SPLIT_VIEW_SPRINGS.move, ownX, ownY),
      );
    }

    pairs.sort(
      (a, b) => a.from.rect.y - b.from.rect.y || a.from.rect.x - b.from.rect.x,
    );
    const stagger = fold === "fold" ? STAGGER.fold : STAGGER.other;
    const flights = new Map<string, Flight>();
    pairs.forEach((pair, index) => {
      const { name, from, to } = pair;
      const config = isPart(pair)
        ? SPLIT_VIEW_SPRINGS.move
        : SPLIT_VIEW_SPRINGS.flight;
      const running = this.flights.get(name);
      const reverses =
        running !== undefined &&
        running.origin.element === to.element &&
        running.destination.element === from.element;
      running?.finish();
      this.flights.delete(name);
      flights.set(
        name,
        reverses
          ? new Flight(
              name,
              from,
              { ...to, rect: running.origin.rect },
              this.layer,
              0,
              config,
              this.underOf(from, to),
              1 - running.spring.value,
              -running.spring.velocity,
            )
          : new Flight(
              name,
              from,
              to,
              this.layer,
              index * stagger,
              config,
              this.underOf(from, to),
            ),
      );
    });
    for (const flight of this.flights.values()) flight.finish();
    this.flights = flights;
  }

  /**
   * The edge of the new screen, where a Shared element flies to or from the
   * screen under it, so that it flies under the new screen too.
   */
  private underOf(from: ShownMark, to: ShownMark) {
    const push = this.push;
    if (push?.back == null) return null;
    const back = push.back;
    return back.contains(from.element) || back.contains(to.element)
      ? () => push.edge
      : null;
  }

  private setFolding(fold: "fold" | "unfold" | null) {
    clearTimeout(this.foldTimer);
    if (this.folding !== fold) {
      this.folding = fold;
      this.events.onFold(fold);
    }
  }

  private *tracks(): Generator<Track> {
    if (this.push !== null) yield this.push;
    if (this.detail !== null) yield this.detail;
    if (this.offset !== null) yield this.offset;
    if (this.fold !== null) yield this.fold;
    yield* this.fades;
    yield* this.moves.values();
    yield* this.flights.values();
    yield* this.holders;
  }

  private render() {
    for (const track of this.tracks()) track.render();
  }

  private start() {
    if (this.frame !== 0) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  /** Flies each part that a new form has drawn since a holder started to wait for it. */
  private landParts() {
    if (!this.holders.some((holder) => holder.isWaiting)) return;
    const origin = this.view.getBoundingClientRect();
    // The page that a form leaves still shows while it moves, so a part
    // is looked for only in the new form.
    const find = (name: string, within: Element) => {
      const shown = [...(this.marks.get(name) ?? [])].filter(
        ([element]) => within.contains(element) && isShown(element),
      );
      if (shown.length !== 1) return null;
      const [[element, options]] = shown;
      return markOf(element, relativeRect(element, origin), options);
    };
    for (const holder of this.holders) {
      for (const { name, from, to } of holder.land(find)) {
        this.flights.get(name)?.finish();
        const flight = new Flight(
          name,
          from,
          to,
          this.layer,
          0,
          SPLIT_VIEW_SPRINGS.move,
          this.underOf(from, to),
          holder.spring.value,
          holder.spring.velocity,
        );
        flight.render();
        this.flights.set(name, flight);
      }
    }
  }

  private readonly tick = (now: number) => {
    const seconds = Math.min(MAX_FRAME, (now - this.last) / 1000);
    this.last = now;
    this.landParts();
    let moving = false;
    for (const track of [...this.tracks()]) {
      if (track.step(seconds)) {
        moving = true;
        track.render();
      } else {
        track.render();
        if (track !== this.push || this.awaitingPop === undefined) {
          this.drop(track);
        }
      }
    }
    this.events.onFrame();
    if (moving) {
      this.frame = requestAnimationFrame(this.tick);
      return;
    }
    this.frame = 0;
    this.events.onSettled(this.played);
    if (this.folding !== null) {
      // The dust needs a moment after the fold to reach the other form.
      this.foldTimer = setTimeout(() => {
        this.setFolding(null);
      }, 900);
    }
  };

  private drop(track: Track) {
    track.finish();
    if (track === this.push) this.push = null;
    else if (track === this.detail) this.detail = null;
    else if (track === this.offset) this.offset = null;
    else if (track === this.fold) this.fold = null;
    else if (track instanceof FadeTrack) {
      this.fades = this.fades.filter((fade) => fade !== track);
    } else if (track instanceof Flight) {
      this.flights.delete(track.name);
    } else if (track instanceof HolderTrack) {
      this.holders = this.holders.filter((holder) => holder !== track);
    } else if (track instanceof OffsetTrack) {
      this.moves.delete(track.element);
    }
  }

  private stopAll() {
    for (const track of [...this.tracks()]) this.drop(track);
    this.setFolding(null);
  }
}
