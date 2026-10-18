import { checkDeclaredCarrier } from "./check-declared-carrier.ts";
import type {
  RegisteredRegion,
  RegisteredSticky,
} from "./create-effect-registry.ts";
import { observeMove, type Edges, type MoveWatch } from "./observe-move.ts";
import {
  readElementBox,
  type CornerRadii,
  type ElementBox,
} from "./read-element-box.ts";
import {
  PAGE_CARRIER,
  resolveCarrier,
  type CarrierKey,
  type CarrierState,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

/** The last measurement of a registered element. */
interface MeasuredElement {
  /** In viewport coordinates, as it was measured. */
  readonly box: ElementBox;
  /** The carrier it was measured on, which tells how its box moves. */
  readonly carrier: CarrierKey;
  /**
   * The box in the coordinates of its carrier: page coordinates on the
   * page, viewport coordinates on the viewport, the distance from the
   * viewport's bottom edge on that edge, or the coordinates of the content
   * box of a Scroll region, without the scale of a transform around it.
   */
  readonly local: ElementBox;
}

/**
 * What a frame knows about the carriers when it reads the elements: the
 * window's scroll, the viewport's bottom edge, and where the content box of
 * each Scroll region is.
 *
 * @internal
 */
export interface CarrierClock {
  readonly scrollX: number;
  readonly scrollY: number;
  /** The viewport's bottom edge now, in viewport coordinates. */
  readonly viewportBottom: () => number;
  /**
   * The page position of the top-left corner of the content box of the
   * Scroll region `id` now, or `null` while the region is not measured.
   */
  readonly regionOrigin: (
    id: number,
  ) => { readonly x: number; readonly y: number } | null;
}

/**
 * Where the carriers of the elements come from: the carrier that each
 * element declares, each sticky carrier with whether it is stuck, each
 * Scroll region with its scroller and its content box, and whether an
 * element is in a modal Effect cover.
 *
 * @internal
 */
export interface CarrierLookup {
  readonly carrierOf: (element: Element) => EffectCarrierRef;
  readonly sticky: (id: number) => RegisteredSticky | undefined;
  readonly region: (id: number) => RegisteredRegion | undefined;
  readonly isInModalCover: (element: Element) => boolean;
}

const PAGE_ONLY: CarrierLookup = {
  carrierOf: () => PAGE_CARRIER,
  sticky: () => undefined,
  region: () => undefined,
  isInModalCover: () => false,
};

/**
 * Where a content box is in one frame: its top-left corner in viewport
 * coordinates, its size without the scale of a transform around it, and
 * that scale.
 *
 * @internal
 */
export interface ContentFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

/**
 * What the elements measured in one frame share: the scroll, the computed
 * styles and boxes of their ancestors, whether an animation source still
 * runs, the roots of their move watches, whether each sticky carrier is
 * stuck, and where each Scroll region is.
 *
 * @internal
 */
export interface MeasureContext extends CarrierState {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly styleOf: (element: Element) => CSSStyleDeclaration;
  /** The border box of an element in viewport coordinates, read once. */
  readonly rectOf: (element: Element) => DOMRect;
  /** Whether a CSS transition or animation still runs on `source`. */
  readonly isAnimating: (source: Element) => boolean;
  /** The viewport for `null`, or else the border box of `root`. */
  readonly watchRoot: (root: Element | null) => Edges;
  /** The viewport's bottom edge now, in viewport coordinates. */
  readonly viewportBottom: () => number;
  /** The carrier that the element declares. */
  readonly carrierOf: (element: Element) => EffectCarrierRef;
  /** The box of the sticky carrier `id`, or `null`. */
  readonly stickyBox: (id: number) => Element | null;
  /** The Scroll region `id`, or `undefined`. */
  readonly region: (id: number) => RegisteredRegion | undefined;
  /** The scroller of the Scroll region `id`, or `null`. */
  readonly regionScroller: (id: number) => Element | null;
  /** Where the content box of the Scroll region `id` is, or `null`. */
  readonly contentFrame: (id: number) => ContentFrame | null;
  /** Whether the element is in a registered modal Effect cover. */
  readonly isInModalCover: (element: Element) => boolean;
}

function isRunning(animation: Animation) {
  return animation.pending || animation.playState === "running";
}

/**
 * A context that reads each computed style, each box, each animation
 * source, each root and the viewport's bottom edge once. Drop it after
 * the frame, so that it keeps no style alive.
 *
 * @internal
 */
export function createMeasureContext(
  readViewportBottom: () => number,
  { carrierOf, sticky, region, isInModalCover }: CarrierLookup = PAGE_ONLY,
): MeasureContext {
  const styles = new Map<Element, CSSStyleDeclaration>();
  const rects = new Map<Element, DOMRect>();
  const animating = new Map<Element, boolean>();
  const contentFrames = new Map<number, ContentFrame | null>();
  const root = document.documentElement;
  let viewportEdges: Edges | null = null;
  let viewportBottom: number | null = null;
  const styleOf = (element: Element) => {
    let style = styles.get(element);
    if (style === undefined) {
      style = getComputedStyle(element);
      styles.set(element, style);
    }
    return style;
  };
  const rectOf = (element: Element) => {
    let rect = rects.get(element);
    if (rect === undefined) {
      rect = element.getBoundingClientRect();
      rects.set(element, rect);
    }
    return rect;
  };
  const readViewport = () => {
    viewportEdges ??= {
      left: 0,
      top: 0,
      right: root.clientWidth,
      bottom: root.clientHeight,
    };
    return viewportEdges;
  };
  const hasRegion = (id: number) => region(id) !== undefined;
  const context: MeasureContext = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    styleOf,
    rectOf,
    isAnimating: (source) => {
      let running = animating.get(source);
      if (running === undefined) {
        running = source.isConnected && source.getAnimations().some(isRunning);
        animating.set(source, running);
      }
      return running;
    },
    watchRoot: (watched) => {
      if (watched === null) {
        return readViewport();
      }
      const { left, top, right, bottom } = rectOf(watched);
      return { left, top, right, bottom };
    },
    viewportBottom: () => {
      viewportBottom ??= readViewportBottom();
      return viewportBottom;
    },
    carrierOf,
    stickyBox: (id) => sticky(id)?.element ?? null,
    region,
    regionScroller: (id) => region(id)?.scroller ?? null,
    hasRegion,
    isInModalCover,
    contentFrame: (id) => {
      if (contentFrames.has(id)) {
        return contentFrames.get(id) ?? null;
      }
      const content = region(id)?.content;
      let frame: ContentFrame | null = null;
      if (content?.isConnected === true) {
        const rect = rectOf(content);
        const [width, height] =
          content instanceof HTMLElement
            ? [content.offsetWidth, content.offsetHeight]
            : [rect.width, rect.height];
        const scale = width > 0 ? rect.width / width : 1;
        frame = {
          left: rect.left,
          top: rect.top,
          width,
          height,
          scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
        };
      }
      contentFrames.set(id, frame);
      return frame;
    },
    isStuck: (id) => sticky(id)?.isStuck() ?? false,
  };
  return context;
}

function edgesOf({ x, y, width, height }: ElementBox): Edges {
  return { left: x, top: y, right: x + width, bottom: y + height };
}

function scaleRadii(radii: CornerRadii, scale: number): CornerRadii {
  return [
    radii[0] / scale,
    radii[1] / scale,
    radii[2] / scale,
    radii[3] / scale,
  ];
}

/**
 * The box in the coordinates of its carrier, or `null` when the content
 * box of its Scroll region cannot be read.
 */
function toCarrier(
  box: ElementBox,
  carrier: CarrierKey,
  context: MeasureContext,
): ElementBox | null {
  switch (carrier) {
    case "page":
      return { ...box, x: box.x + context.scrollX, y: box.y + context.scrollY };
    case "fixed":
      return box;
    case "fixedBottom":
      return { ...box, y: box.y - context.viewportBottom() };
    default: {
      const frame = context.contentFrame(carrier);
      if (frame === null) {
        return null;
      }
      const { left, top, scale } = frame;
      return {
        ...box,
        x: (box.x - left) / scale,
        y: (box.y - top) / scale,
        width: box.width / scale,
        height: box.height / scale,
        radii: scaleRadii(box.radii, scale),
      };
    }
  }
}

/**
 * Tracks one registered element: it keeps the element's last measurement
 * and the observers that tell when it can have changed, its own
 * `ResizeObserver` and a move watch from `observeMove`. On each signal it
 * calls `onSignal`, which queues it to measure again before the next paint.
 * A new tracker is queued at once. `declared` is its carrier, for an
 * element that is not registered; else the carrier comes from the context.
 *
 * @internal
 */
export function createElementTracker(
  element: Element,
  onSignal: (tracker: ElementTracker) => void,
  declared: EffectCarrierRef | null = null,
) {
  let measured: MeasuredElement | null = null;
  let measurement = 0;
  let watch: MoveWatch | null = null;
  let destroyed = false;
  const animationSources = new Set<Element>();
  const signal = () => {
    if (!destroyed) {
      onSignal(tracker);
    }
  };
  // The first notice comes after the first measurement, with the size that
  // it read. Thus, measure again only for a size that is new.
  const resizeObserver = new ResizeObserver((entries) => {
    const size = entries.at(-1)?.borderBoxSize.at(0);
    const known =
      measured !== null &&
      size !== undefined &&
      size.inlineSize === measured.box.width &&
      size.blockSize === measured.box.height;
    if (!known) {
      signal();
    }
  });
  resizeObserver.observe(element, { box: "border-box" });

  /**
   * The box that a move watch of the element watches against: one that
   * moves with the element's carrier, so that a scroll does not move the
   * element in it. `null` is the viewport.
   */
  function rootOf(carrier: CarrierKey, context: MeasureContext) {
    const page = element.ownerDocument.documentElement;
    if (carrier === "page") {
      return page;
    }
    if (carrier === "fixed" || carrier === "fixedBottom") {
      return null;
    }
    const region = context.region(carrier);
    if (region === undefined) {
      return page;
    }
    // An observer reads a root only when the element is inside it.
    return region.content.contains(element)
      ? region.content
      : region.scroller.contains(element)
        ? region.scroller
        : page;
  }

  function rewatch(context: MeasureContext) {
    if (measured === null || animationSources.size > 0) {
      watch?.disconnect();
      watch = null;
      return;
    }
    const rootElement = rootOf(measured.carrier, context);
    const area = {
      rect: edgesOf(measured.box),
      rootElement,
      root: context.watchRoot(rootElement),
    };
    if (watch?.covers(area) === true) {
      return;
    }
    watch?.disconnect();
    watch = observeMove(element, area, signal);
  }

  const tracker = {
    element,
    /** The carrier the tracker gives its element, or `null` for its own. */
    declared,
    get measured() {
      return measured;
    },
    /** How many times it has measured the element. */
    get measurement() {
      return measurement;
    },
    /**
     * The last measured box in page coordinates at the time of `clock`,
     * from the carrier it was measured on: an element on the page keeps its
     * page position, an element on the viewport keeps its viewport
     * position, an element on the viewport's bottom edge keeps its distance
     * from that edge, and an element in a Scroll region keeps its place in
     * the region's content box. `null` while it has no box, or while its
     * region has no place.
     */
    boxAt(clock: CarrierClock): ElementBox | null {
      if (measured === null) {
        return null;
      }
      const { local, carrier } = measured;
      switch (carrier) {
        case "page":
          return local;
        case "fixed":
          return {
            ...local,
            x: local.x + clock.scrollX,
            y: local.y + clock.scrollY,
          };
        case "fixedBottom":
          return {
            ...local,
            x: local.x + clock.scrollX,
            y: local.y + clock.scrollY + clock.viewportBottom(),
          };
        default: {
          const origin = clock.regionOrigin(carrier);
          return origin === null
            ? null
            : { ...local, x: local.x + origin.x, y: local.y + origin.y };
        }
      }
    },
    signal,
    /**
     * Measures again each frame while `source`, the element itself, an
     * ancestor or a descendant, runs a CSS transition or animation, and once
     * more after it stops.
     */
    follow(source: Element) {
      animationSources.add(source);
      signal();
    },
    /**
     * Reads the element's box now, on the carrier that it declares, and
     * watches it from there. While an animation it follows still runs, it
     * queues itself again instead.
     */
    measure(context: MeasureContext) {
      if (destroyed) {
        return;
      }
      const box = element.isConnected
        ? readElementBox(element, context.styleOf)
        : null;
      measurement += 1;
      measured = null;
      if (box !== null) {
        const ref = declared ?? context.carrierOf(element);
        const carrier = resolveCarrier(ref, context);
        if (process.env.NODE_ENV !== "production") {
          checkDeclaredCarrier(element, ref, context);
        }
        const local = toCarrier(box, carrier, context);
        if (local !== null) {
          measured = { box, carrier, local };
        }
      }
      for (const source of animationSources) {
        if (!context.isAnimating(source)) {
          animationSources.delete(source);
        }
      }
      rewatch(context);
      if (animationSources.size > 0) {
        signal();
      }
    },
    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      watch?.disconnect();
      watch = null;
      animationSources.clear();
    },
  };
  signal();
  return tracker;
}

/** @internal */
export type ElementTracker = ReturnType<typeof createElementTracker>;
