import { isDarkBackground } from "../effect-layer/dust-color.ts";
import { parseCssColor } from "../effect-layer/parse-css-color.ts";
import { readPageBackdrop } from "../effect-layer/plan-scopes.ts";
import { isRendered } from "../focus/is-rendered.ts";
import { bind, type Binding } from "../motion/bind.ts";
import type { MotionEngine } from "../motion/create-motion-engine.ts";
import {
  createMotionValue,
  type MotionValue,
} from "../motion/create-motion-value.ts";
import { mix, smoothstep, unit } from "../motion/mix.ts";
import {
  captureLayout,
  playLayout,
  rectIn,
  type Rect,
} from "../motion/play-layout.ts";
import { px, type Styles } from "../motion/px.ts";
import {
  springOf,
  springRoles,
  type SpringRole,
} from "../motion/spring-roles.ts";

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
/** How far a Shared element that dips fades out at the middle of its flight. */
const DIP = 0.85;
/** Where on its way the rest of a Shared element that holds others starts to show. */
const LATE_FROM = 0.7;
/** How long, in seconds, a Shared element that holds others waits for the new form to draw them. */
const PART_WAIT = 0.25;
/** How close to its target, in its own units, a value of the motion is at rest. */
const REST = 2e-4;
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

/** A part of the motion, such as the push of a page or one flight. */
interface Part {
  /** Whether a value of the part still moves. */
  isMoving(): boolean;
  /** Stops the part and takes off every style it wrote. */
  drop(): void;
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

function setStyle(element: SplitViewMarkElement, styles: Styles) {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
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

/** A value of the motion that springs as `role`. */
function springValue(engine: MotionEngine, initial: number, role: SpringRole) {
  return createMotionValue(engine, initial, {
    spring: springOf(role),
    precision: REST,
  });
}

/**
 * Shows `values` on `element` through `pose`. The view writes its motion
 * once a frame: its use of Web Animations waits for checks in each browser.
 */
function show(
  element: SplitViewMarkElement,
  values: MotionValue | readonly MotionValue[],
  pose: (...values: number[]) => Styles,
): Binding {
  return bind(element, values, { pose, renderer: "frame" });
}

function unbindAll(bindings: readonly Binding[]) {
  for (const binding of bindings) binding.unbind();
}

/** Where a part springs, from what moves its `progress`. */
interface Pose {
  readonly element: HTMLElement | null;
  readonly pose: (progress: number) => Styles;
}

function showAll(progress: MotionValue, poses: readonly Pose[]) {
  return poses.flatMap(({ element, pose }) =>
    element === null ? [] : [show(element, progress, pose)],
  );
}

/**
 * The screen under a new one and the new one: the new one comes in from the
 * inline end over the one under it, which moves back a little and dims.
 * `progress` is 1 where the new one is in.
 */
interface Push extends Part {
  readonly progress: MotionValue;
  readonly front: HTMLElement;
  readonly back: HTMLElement | null;
  /** Where the inline-start edge of the new screen is at `progress`, from the view's. */
  readonly edgeAt: (progress: number) => number;
  setBack(back: HTMLElement | null): void;
  /** Moves the new screen to `front`, and leaves the one it was where it shows now. */
  setFront(front: HTMLElement): void;
}

function createPush(
  engine: MotionEngine,
  initialBack: HTMLElement | null,
  initialFront: HTMLElement,
  { x: left, width }: Rect,
  presentation: "columns" | "stacked",
  fill: string,
  initial: number,
): Push {
  const progress = springValue(
    engine,
    initial,
    presentation === "columns" ? springRoles.columnPush : springRoles.stackPush,
  );
  const strength = DIM[presentation][isDark(fill) ? "dark" : "light"];
  const frontPoses = (front: HTMLElement): Pose[] => [
    {
      element: front,
      pose: (p) => ({
        transform: `translateX(${px(width * (1 - p))})`,
        visibility: p <= 0.001 ? "hidden" : "visible",
        "content-visibility": "visible",
        "background-color": fill,
      }),
    },
    { element: edgeOf(front), pose: (p) => ({ opacity: edgeOpacity(p) }) },
  ];
  const backPoses = (back: HTMLElement | null): Pose[] =>
    back === null
      ? []
      : [
          {
            element: back,
            pose: (p) => {
              const shown = unit(p);
              return {
                transform: `translateX(${px(-PARALLAX[presentation] * width * shown)})`,
                visibility: shown >= 0.999 ? "" : "visible",
                "content-visibility": shown >= 0.999 ? "" : "visible",
                "background-color": fill,
              };
            },
          },
          {
            element: dimOf(back),
            pose: (p) => ({
              opacity: ((unit(p) * strength) / SCRIM_OPACITY).toFixed(3),
            }),
          },
        ];
  let front = initialFront;
  let back = initialBack;
  let frontBindings = showAll(progress, frontPoses(front));
  let backBindings = showAll(progress, backPoses(back));
  return {
    progress,
    get front() {
      return front;
    },
    get back() {
      return back;
    },
    edgeAt: (p) => left + width * (1 - p),
    isMoving: () => progress.isMoving,
    setBack(next) {
      if (next === back) return;
      unbindAll(backBindings);
      back = next;
      backBindings = showAll(progress, backPoses(back));
    },
    setFront(next) {
      const now = progress.get();
      const frozen = frontPoses(front);
      unbindAll(frontBindings);
      for (const { element, pose } of frozen) {
        if (element !== null) setStyle(element, pose(now));
      }
      front = next;
      frontBindings = showAll(progress, frontPoses(front));
    },
    drop() {
      unbindAll(frontBindings);
      unbindAll(backBindings);
      progress.stop();
    },
  };
}

/** The detail column, which comes in from the inline end and goes back there. */
interface Detail extends Part {
  readonly progress: MotionValue;
  readonly column: HTMLElement;
}

function createDetail(
  engine: MotionEngine,
  column: HTMLElement,
  width: number,
  fill: string,
  initial: number,
): Detail {
  const progress = springValue(engine, initial, springRoles.columnPush);
  const bindings = showAll(progress, [
    {
      element: column,
      pose: (p) => ({
        transform: `translateX(${px(width * (1 - p))})`,
        visibility: p <= 0.001 ? "hidden" : "visible",
        "background-color": fill,
      }),
    },
    { element: edgeOf(column), pose: (p) => ({ opacity: edgeOpacity(p) }) },
  ]);
  return {
    progress,
    column,
    isMoving: () => progress.isMoving,
    drop() {
      unbindAll(bindings);
      progress.stop();
    },
  };
}

/**
 * The content column, which springs from where it showed to its new place
 * beside the sidebar, over what is next to it.
 */
interface Offset extends Part {
  readonly x: MotionValue;
}

function createOffset(
  engine: MotionEngine,
  content: HTMLElement,
  dx: number,
  velocity: number,
  styles: Styles,
): Offset {
  const x = springValue(engine, dx, springRoles.fold);
  x.to(0, { velocity });
  const binding = show(content, x, (at) => ({
    ...styles,
    transform: `translate(${px(at)}, ${px(0)})`,
  }));
  return {
    x,
    isMoving: () => x.isMoving,
    drop() {
      binding.unbind();
      x.stop();
    },
  };
}

/**
 * The two forms of the sidebar while it folds: the full sidebar fades and
 * drifts towards the strip, and the Collapsed sidebar fades in late, as its
 * Shared elements land. `progress` is 1 where the sidebar is folded.
 */
interface Fold extends Part {
  go(target: 0 | 1, delay: number): void;
}

function createFold(
  engine: MotionEngine,
  full: HTMLElement,
  collapsed: HTMLElement,
  initial: number,
): Fold {
  const progress = springValue(engine, initial, springRoles.fold);
  const bindings = [
    show(full, progress, (folded) => ({
      visibility: "visible",
      opacity: (1 - smoothstep(0, 0.35, folded)).toFixed(3),
      transform: `translateX(${px(-FOLD_DRIFT * unit(folded * 3))})`,
    })),
    show(collapsed, progress, (folded) => ({
      visibility: "visible",
      opacity: smoothstep(0.55, 1, folded).toFixed(3),
    })),
  ];
  return {
    go(target, delay) {
      progress.to(target, { delay });
      full.toggleAttribute("data-split-view-leaving", target === 1);
      collapsed.toggleAttribute("data-split-view-leaving", target === 0);
    },
    isMoving: () => progress.isMoving,
    drop() {
      unbindAll(bindings);
      progress.stop();
      for (const form of [full, collapsed]) {
        form.removeAttribute("data-split-view-leaving");
      }
    },
  };
}

/** A fade of an element over `CROSS_FADE` seconds, out over what replaced it, or in. */
function createFade(
  engine: MotionEngine,
  element: HTMLElement,
  direction: "in" | "out",
): Part {
  const shown = createMotionValue(engine, 0);
  shown.to(1, { tween: { duration: CROSS_FADE } });
  const out = direction === "out";
  const binding = show(element, shown, (t) => ({
    opacity: (out ? 1 - t : t).toFixed(3),
    "z-index": out ? "2" : "",
    visibility: out ? "visible" : "",
    "content-visibility": out ? "visible" : "",
  }));
  return {
    isMoving: () => shown.isMoving,
    drop() {
      binding.unbind();
      shown.stop();
      setStyle(element, { transform: "", "background-color": "" });
    },
  };
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

/** The live edge of a screen that the copies of a flight go under. */
interface Under {
  readonly progress: MotionValue;
  readonly edgeAt: (progress: number) => number;
}

/**
 * A Shared element on its way from where it showed to where it shows now:
 * a copy of each end flies in the layer over the view, and the ends wait
 * out of sight. Ends of a like shape stretch with the box and cross-fade;
 * ends of unlike shapes keep the shape of their content, and the new one
 * shows late. A part of an SVG drawing stretches its drawing, and its
 * lines keep their width.
 */
interface Flight extends Part {
  readonly origin: ShownMark;
  readonly destination: ShownMark;
  readonly progress: MotionValue;
  /** Where the element shows now. */
  rect(): Rect;
  /** Copies the new form again where it drew its content since. */
  refresh(): void;
}

function createFlight(
  engine: MotionEngine,
  {
    origin,
    destination,
    layer,
    delay,
    role,
    under,
    start = { value: 0, velocity: 0 },
  }: {
    origin: ShownMark;
    destination: ShownMark;
    layer: HTMLElement;
    delay: number;
    role: SpringRole;
    under: Under | null;
    start?: { value: number; velocity: number };
  },
): Flight {
  const progress = springValue(engine, start.value, role);
  progress.to(1, { delay, velocity: start.velocity });
  const ratio = aspect(origin.rect) / aspect(destination.rect);
  const contain =
    destination.drawn === null && Math.max(ratio, 1 / ratio) > CONTAIN_ASPECT;
  const dips = destination.options.fade === "dip";
  const from = copyOf(origin, layer);
  const to = copyOf(destination, layer);
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
      // copy starts at `left` in the view, and a px of it is `scale` px there.
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
  const bindings = [
    show(from, values, placeOf(from, origin.rect, 0)),
    show(to, values, placeOf(to, destination.rect, 1)),
  ];

  return {
    origin,
    destination,
    progress,
    rect: () => mixRect(origin.rect, destination.rect, progress.get()),
    refresh() {
      if (!isStale) return;
      isStale = false;
      to.replaceChildren(copyElement(destination));
    },
    isMoving: () => progress.isMoving,
    drop() {
      unbindAll(bindings);
      progress.stop();
      watcher.disconnect();
      from.remove();
      to.remove();
      origin.element.style.removeProperty("opacity");
      destination.element.style.removeProperty("opacity");
    },
  };
}

interface WaitingPart {
  readonly name: string;
  readonly from: ShownMark;
}

interface LandedPart {
  readonly name: string;
  readonly from: ShownMark;
  readonly to: ShownMark;
}

/**
 * A Shared element that holds others, such as a chart that holds its line
 * and its labels: the ones it holds fly on their own, the form it leaves
 * stays where it is, and the rest of the form it goes to shows only as
 * they land. A new form can draw what it holds a moment after it mounts,
 * such as a chart that measures its width first, so the motion waits for
 * the parts that it has not drawn yet, and they set off together.
 */
interface Holder extends Part {
  readonly progress: MotionValue;
  readonly isWaiting: boolean;
  /** The waiting parts that `find` finds in the new form now, which stop waiting. */
  land(find: (name: string, within: Element) => ShownMark | null): LandedPart[];
}

function createHolder(
  engine: MotionEngine,
  destination: ShownMark,
  parts: readonly WaitingPart[],
): Holder {
  const { loop } = engine;
  const progress = springValue(engine, 0, springRoles.move);
  const startedAt = loop.now();
  let waiting = parts;
  progress.to(1, { delay: waiting.length > 0 ? PART_WAIT : 0 });
  const binding = show(destination.element, progress, (p) => ({
    opacity: smoothstep(LATE_FROM, 1, p).toFixed(3),
  }));
  const isWaiting = () =>
    waiting.length > 0 && loop.now() - startedAt <= PART_WAIT;
  return {
    progress,
    get isWaiting() {
      return isWaiting();
    },
    land(find) {
      if (!isWaiting()) return [];
      const landed: LandedPart[] = [];
      waiting = waiting.filter(({ name, from }) => {
        const to = find(name, destination.element);
        if (to === null) return true;
        landed.push({ name, from, to });
        return false;
      });
      if (waiting.length === 0) progress.to(1);
      return landed;
    },
    isMoving: () => progress.isMoving,
    drop() {
      binding.unbind();
      progress.stop();
    },
  };
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
 * The motion of a `NavigationSplitView`: the motion values, the bindings
 * that show them, and the Shared elements. The view reads a snapshot when a
 * navigation is about to change the composition, and plays the change after
 * it. A change that comes while a motion runs turns each part from where it
 * is, at the speed it has. The motion writes only `transform`, `opacity` and
 * `visibility`, once a frame, and reads the layout only when a change starts.
 *
 * @internal
 */
export interface SplitViewMotion {
  /** Reads where each Shared element shows now, as the screen shows it. */
  capture(): SplitViewSnapshot;
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
  ): void;
  /**
   * Starts a swipe back over the content, which `drag` moves and `release`
   * ends. False where there is no screen to swipe.
   */
  beginSwipe(): boolean;
  /** Puts the swiped screen `progress` of the way in. */
  drag(progress: number): void;
  /** Lets go of a swipe: the screen goes out where `pop`, and back in else, at `velocity` of progress a second. */
  release(pop: boolean, velocity: number): void;
  destroy(): void;
}

/** @internal */
export function createSplitViewMotion(
  engine: MotionEngine,
  view: HTMLElement,
  layer: HTMLElement,
  marks: SplitViewMarks,
  events: SplitViewMotionEvents,
): SplitViewMotion {
  let push: Push | null = null;
  let detail: Detail | null = null;
  let offset: Offset | null = null;
  let fold: Fold | null = null;
  let fades: Part[] = [];
  let flights = new Map<string, Flight>();
  let holders: Holder[] = [];
  let stopTicking: (() => void) | null = null;
  let folding: "fold" | "unfold" | null = null;
  let foldTimer: ReturnType<typeof setTimeout> | undefined;
  let played = 0;
  /** A swipe let go to go back holds the screen out until the view pops it. */
  let awaitingPop: ReturnType<typeof setTimeout> | undefined;

  /** The one element of the Shared element `name` that shows, in `within` where given, with its options. */
  function shownMark(name: string, within?: Element) {
    const found = [...(marks.get(name) ?? [])].filter(
      ([element]) =>
        (within === undefined || within.contains(element)) && isShown(element),
    );
    return found.length === 1 ? found[0] : null;
  }

  function shownMarks() {
    return [...marks.keys()].flatMap((name) => {
      const found = shownMark(name);
      return found === null
        ? []
        : [{ name, element: found[0], options: found[1] }];
    });
  }

  function sidebarShown() {
    const full = view.querySelector(SELECTOR.fullSidebar);
    const collapsed = view.querySelector(SELECTOR.collapsedSidebar);
    if (full !== null && isShown(full)) return "full";
    if (collapsed !== null && isShown(collapsed)) return "collapsed";
    return null;
  }

  function setFolding(next: "fold" | "unfold" | null) {
    clearTimeout(foldTimer);
    if (folding !== next) {
      folding = next;
      events.onFold(next);
    }
  }

  function stopAwaitingPop() {
    if (awaitingPop === undefined) return;
    clearTimeout(awaitingPop);
    awaitingPop = undefined;
    if (push !== null && !push.isMoving()) {
      push.drop();
      push = null;
    }
  }

  /**
   * The edge of the new screen, where a Shared element flies to or from the
   * screen under it, so that it flies under the new screen too.
   */
  function underOf(from: ShownMark, to: ShownMark): Under | null {
    const current = push;
    const back = current?.back;
    if (current == null || back == null) return null;
    return back.contains(from.element) || back.contains(to.element)
      ? { progress: current.progress, edgeAt: current.edgeAt }
      : null;
  }

  /** Flies each part that a new form has drawn since a holder started to wait for it. */
  function landParts() {
    if (!holders.some((holder) => holder.isWaiting)) return;
    const origin = view.getBoundingClientRect();
    // The page that a form leaves still shows while it moves, so a part
    // is looked for only in the new form.
    const find = (name: string, within: Element) => {
      const found = shownMark(name, within);
      if (found === null) return null;
      const [element, options] = found;
      return markOf(element, rectIn(element, origin), options);
    };
    for (const holder of holders) {
      for (const { name, from, to } of holder.land(find)) {
        flights.get(name)?.drop();
        flights.set(
          name,
          createFlight(engine, {
            origin: from,
            destination: to,
            layer,
            delay: 0,
            role: springRoles.move,
            under: underOf(from, to),
            start: {
              value: holder.progress.get(),
              velocity: holder.progress.getVelocity(),
            },
          }),
        );
      }
    }
  }

  function dropResting() {
    if (push !== null && !push.isMoving()) {
      if (awaitingPop === undefined) {
        push.drop();
        push = null;
      } else {
        // A fade that ends removes the styles that it wrote, also where the
        // push that waits for the pop wrote them. Thus the push writes its
        // pose again before the fades end.
        push.progress.set(push.progress.get());
      }
    }
    if (detail !== null && !detail.isMoving()) {
      detail.drop();
      detail = null;
    }
    if (offset !== null && !offset.isMoving()) {
      offset.drop();
      offset = null;
    }
    if (fold !== null && !fold.isMoving()) {
      fold.drop();
      fold = null;
    }
    const keep = (part: Part) => {
      if (part.isMoving()) return true;
      part.drop();
      return false;
    };
    fades = fades.filter(keep);
    flights = new Map([...flights].filter(([, flight]) => keep(flight)));
    holders = holders.filter(keep);
  }

  function frame() {
    landParts();
    for (const flight of flights.values()) flight.refresh();
    dropResting();
    events.onFrame();
    if (engine.isMoving) return;
    stopTicking?.();
    stopTicking = null;
    events.onSettled(played);
    if (folding !== null) {
      // The dust needs a moment after the fold to reach the other form.
      foldTimer = setTimeout(() => {
        setFolding(null);
      }, 900);
    }
  }

  function start() {
    stopTicking ??= engine.loop.every(frame);
  }

  function stopAll() {
    push?.drop();
    detail?.drop();
    offset?.drop();
    fold?.drop();
    for (const part of [...fades, ...flights.values(), ...holders]) {
      part.drop();
    }
    push = null;
    detail = null;
    offset = null;
    fold = null;
    fades = [];
    flights = new Map();
    holders = [];
    stopTicking?.();
    stopTicking = null;
    // This stops the moves of `playLayout` too.
    engine.destroy();
    setFolding(null);
  }

  function playReduced(change: SplitViewChange) {
    const content = view.querySelector<HTMLElement>(SELECTOR.content);
    const column = view.querySelector<HTMLElement>(SELECTOR.detail);
    const fadeOut = (element: HTMLElement | null | undefined) => {
      if (element != null) fades.push(createFade(engine, element, "out"));
    };
    if (change.content === "push") {
      fadeOut(content?.querySelector<HTMLElement>(SELECTOR.page("under")));
    } else if (change.content !== null) {
      fadeOut(content?.querySelector<HTMLElement>(SELECTOR.page("leaving")));
    }
    if (change.detail === "in" && column !== null) {
      fades.push(createFade(engine, column, "in"));
    } else if (change.detail === "out") {
      fadeOut(column);
    } else if (change.detail === "swap") {
      fadeOut(column?.querySelector<HTMLElement>(SELECTOR.page("leaving")));
    }
  }

  // Each `plan*` reads the layout while the motion is at its layout pose,
  // and gives the step that starts the motion after all the reads.
  const noStart = () => {};

  function planContent(
    kind: SplitViewChange["content"],
    presentation: "columns" | "stacked",
  ) {
    if (kind === null) return noStart;
    const content = view.querySelector<HTMLElement>(SELECTOR.content);
    if (content === null) return noStart;
    const under = content.querySelector<HTMLElement>(SELECTOR.page("under"));
    const current = content.querySelector<HTMLElement>(
      SELECTOR.page("current"),
    );
    const leaving = content.querySelector<HTMLElement>(
      SELECTOR.page("leaving"),
    );
    if (current === null) return noStart;
    if (kind === "swap") {
      if (leaving === null) return noStart;
      return () => {
        if (push?.front === leaving) push.setFront(current);
        fades.push(createFade(engine, leaving, "out"));
      };
    }
    const back = kind === "push" ? under : current;
    const front = kind === "push" ? current : leaving;
    if (front === null) return noStart;
    const target = kind === "push" ? 1 : 0;
    const running = push;
    if (
      running !== null &&
      running.front === front &&
      (running.back === back || running.back === null)
    ) {
      return () => {
        running.setBack(back);
        running.progress.to(target);
      };
    }
    running?.drop();
    push = null;
    const rect = rectIn(content, view.getBoundingClientRect());
    const fill = backdropOf(content);
    return () => {
      push = createPush(
        engine,
        back,
        front,
        rect,
        presentation,
        fill,
        1 - target,
      );
      push.progress.to(target);
    };
  }

  function planDetail(kind: SplitViewChange["detail"]) {
    if (kind === null) return noStart;
    const column = view.querySelector<HTMLElement>(SELECTOR.detail);
    if (column === null) return noStart;
    if (kind === "swap") {
      const leaving = column.querySelector<HTMLElement>(
        SELECTOR.page("leaving"),
      );
      return () => {
        if (leaving !== null) fades.push(createFade(engine, leaving, "out"));
      };
    }
    const target = kind === "in" ? 1 : 0;
    const running = detail;
    if (running !== null && running.column === column) {
      return () => {
        running.progress.to(target);
      };
    }
    running?.drop();
    detail = null;
    const width = column.getBoundingClientRect().width;
    const fill = backdropOf(column);
    return () => {
      detail = createDetail(engine, column, width, fill, 1 - target);
      detail.progress.to(target);
    };
  }

  function planOffset(before: number | null) {
    const content = view.querySelector<HTMLElement>(SELECTOR.content);
    if (content === null || before === null) return noStart;
    const dx = before - content.getBoundingClientRect().left;
    const velocity = offset?.x.getVelocity() ?? 0;
    offset?.drop();
    offset = null;
    if (Math.abs(dx) < 0.5) return noStart;
    const styles = {
      "z-index": "1",
      "background-color": backdropOf(content),
      "box-shadow": events.seam,
    };
    return () => {
      offset = createOffset(engine, content, dx, velocity, styles);
    };
  }

  function planFold(change: "fold" | "unfold" | null) {
    if (change === null) return noStart;
    const full = view.querySelector<HTMLElement>(SELECTOR.fullSidebar);
    const collapsed = view.querySelector<HTMLElement>(
      SELECTOR.collapsedSidebar,
    );
    if (full === null || collapsed === null) return noStart;
    return () => {
      fold ??= createFold(engine, full, collapsed, change === "fold" ? 0 : 1);
      fold.go(change === "fold" ? 1 : 0, change === "unfold" ? 0.04 : 0);
      setFolding(change);
    };
  }

  function planMarks(
    before: SplitViewSnapshot,
    origin: DOMRect,
    change: "fold" | "unfold" | null,
  ) {
    const after = new Map<string, ShownMark>();
    for (const { name, element, options } of shownMarks()) {
      after.set(name, markOf(element, rectIn(element, origin), options));
    }

    const paired: LandedPart[] = [];
    const moved = new Map<SplitViewMarkElement, Rect>();
    for (const [name, to] of after) {
      const from = before.marks.get(name);
      if (from === undefined) continue;
      if (from.element === to.element) {
        const dx = from.rect.x - to.rect.x;
        const dy = from.rect.y - to.rect.y;
        if (Math.hypot(dx, dy) >= 0.5) moved.set(to.element, from.rect);
      } else {
        paired.push({ name, from, to });
      }
    }
    const holds = (outer: ShownMark, inner: ShownMark) =>
      outer.element !== inner.element && outer.element.contains(inner.element);
    const waitingIn = ({ from }: LandedPart) =>
      [...before.marks]
        .filter(([name, mark]) => !after.has(name) && holds(from, mark))
        .map(([name, mark]) => ({ name, from: mark }));
    const isHolder = (pair: LandedPart) =>
      paired.some(
        (other) => holds(pair.from, other.from) || holds(pair.to, other.to),
      ) || waitingIn(pair).length > 0;
    const isPart = ({ from, to }: LandedPart) =>
      paired.some((other) => holds(other.from, from) || holds(other.to, to));
    const pairs = paired
      .filter((pair) => !isHolder(pair))
      .sort(
        (a, b) =>
          a.from.rect.y - b.from.rect.y || a.from.rect.x - b.from.rect.x,
      );

    return () => {
      for (const holder of holders) holder.drop();
      holders = paired
        .filter(isHolder)
        .map((pair) => createHolder(engine, pair.to, waitingIn(pair)));

      const movedFrom: ReadonlyMap<Element, Rect> = moved;
      playLayout(
        engine,
        { origin: view, rectOf: (element) => movedFrom.get(element) },
        moved.keys(),
        { spring: springOf(springRoles.move) },
      );

      const stagger = change === "fold" ? STAGGER.fold : STAGGER.other;
      const next = new Map<string, Flight>();
      pairs.forEach((pair, index) => {
        const { name, from, to } = pair;
        const role = isPart(pair) ? springRoles.move : springRoles.flight;
        const running = flights.get(name);
        const reverses =
          running !== undefined &&
          running.origin.element === to.element &&
          running.destination.element === from.element;
        const start = reverses
          ? {
              value: 1 - running.progress.get(),
              velocity: -running.progress.getVelocity(),
            }
          : undefined;
        running?.drop();
        flights.delete(name);
        next.set(
          name,
          createFlight(engine, {
            origin: from,
            destination: reverses ? { ...to, rect: running.origin.rect } : to,
            layer,
            delay: reverses ? 0 : index * stagger,
            role,
            under: underOf(from, to),
            start,
          }),
        );
      });
      for (const flight of flights.values()) flight.drop();
      flights = next;
    };
  }

  return {
    capture() {
      const shown = shownMarks();
      const layout = captureLayout(
        shown.map(({ element }) => element),
        view,
      );
      const captured = new Map<string, ShownMark>();
      for (const { name, element, options } of shown) {
        const flight = flights.get(name);
        const rect =
          flight !== undefined && flight.destination.element === element
            ? flight.rect()
            : layout.rectOf(element);
        if (rect !== undefined) {
          captured.set(name, markOf(element, rect, options));
        }
      }
      const content = view.querySelector(SELECTOR.content);
      return {
        marks: captured,
        contentLeft:
          content === null ? null : content.getBoundingClientRect().left,
        sidebar: sidebarShown(),
      };
    },

    play(snapshot, change, motion) {
      const before = snapshot ?? NOTHING_SHOWN;
      played = motion;
      if (change.content !== null) stopAwaitingPop();
      if (engine.reducedMotion) {
        stopAll();
        playReduced(change);
        start();
        return;
      }
      const starts = engine.measure(() => {
        const origin = view.getBoundingClientRect();
        const rem =
          Number.parseFloat(
            getComputedStyle(document.documentElement).fontSize,
          ) || 16;
        const presentation = origin.width / rem < 30 ? "stacked" : "columns";
        const sidebar = sidebarShown();
        const foldChange =
          before.sidebar === "full" && sidebar === "collapsed"
            ? "fold"
            : before.sidebar === "collapsed" && sidebar === "full"
              ? "unfold"
              : null;
        return [
          planContent(change.content, presentation),
          planDetail(change.detail),
          planOffset(before.contentLeft),
          planFold(foldChange),
          planMarks(before, origin, foldChange),
        ];
      });
      for (const startPart of starts) startPart();
      start();
    },

    beginSwipe() {
      const content = view.querySelector<HTMLElement>(SELECTOR.content);
      const front = content?.querySelector<HTMLElement>(
        SELECTOR.page("current"),
      );
      if (content == null || front == null) return false;
      const back = content.querySelector<HTMLElement>(SELECTOR.page("under"));
      if (push === null || push.front !== front) {
        push?.drop();
        push = createPush(
          engine,
          back,
          front,
          rectIn(content, view.getBoundingClientRect()),
          "stacked",
          backdropOf(content),
          1,
        );
      }
      push.progress.stop();
      return true;
    },

    drag(progress) {
      push?.progress.set(progress);
      events.onFrame();
    },

    release(pop, velocity) {
      if (push === null) return;
      if (engine.reducedMotion) {
        push.progress.set(pop ? 0 : 1);
        if (pop) fades.push(createFade(engine, push.front, "out"));
      } else {
        push.progress.to(pop ? 0 : 1, { velocity });
      }
      if (pop) {
        clearTimeout(awaitingPop);
        awaitingPop = setTimeout(() => {
          stopAwaitingPop();
        }, 4000);
      }
      start();
    },

    destroy() {
      clearTimeout(foldTimer);
      clearTimeout(awaitingPop);
      stopAll();
    },
  };
}
