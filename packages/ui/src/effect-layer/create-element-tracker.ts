import { carrierOf } from "./carrier-of.ts";
import { checkDeclaredCarrier } from "./check-declared-carrier.ts";
import type {
  RegisteredRegion,
  RegisteredSticky,
} from "./create-effect-registry.ts";
import { observeMove, type Edges, type MoveWatch } from "./observe-move.ts";
import { readElementBox, type ElementBox } from "./read-element-box.ts";
import { readRoles } from "./read-roles.ts";
import {
  PAGE_CARRIER,
  resolveCarrier,
  type CarrierState,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";
import type { Carrier, EffectReadings } from "./types.ts";

interface Size {
  readonly width: number;
  readonly height: number;
}

/** The last measurement of a registered element. */
interface MeasuredElement {
  /** In viewport coordinates, as it was measured. */
  readonly box: ElementBox;
  /** The carrier it was measured on, which tells how its box moves. */
  readonly carrier: Carrier;
  /** The box in the coordinates of its carrier, as `Carrier.toLocal` gives it. */
  readonly local: ElementBox;
  /** What the effects of its roles read of it, as `readRoles` gives it. */
  readonly readings: EffectReadings;
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
 * What a measurement takes from the registry: the carrier that each
 * element declares, each sticky carrier with whether it is stuck, each
 * Scroll region with its scroller and its content box, whether an element
 * is in a modal Effect cover, and the roles of each element.
 *
 * @internal
 */
export interface RegistryLookup {
  readonly carrierOf: (element: Element) => EffectCarrierRef;
  readonly sticky: (id: number) => RegisteredSticky | undefined;
  readonly region: (id: number) => RegisteredRegion | undefined;
  readonly isInModalCover: (element: Element) => boolean;
  readonly rolesOf: (element: Element) => number;
}

const PAGE_ONLY: RegistryLookup = {
  carrierOf: () => PAGE_CARRIER,
  sticky: () => undefined,
  region: () => undefined,
  isInModalCover: () => false,
  rolesOf: () => 0,
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
  /** The roles of a registered element, or 0. */
  readonly rolesOf: (element: Element) => number;
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
  {
    carrierOf,
    sticky,
    region,
    isInModalCover,
    rolesOf,
  }: RegistryLookup = PAGE_ONLY,
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
    rolesOf,
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

/**
 * Tracks one registered element: it keeps the element's last measurement
 * and the observers that tell when it can have changed, its own
 * `ResizeObserver`, also on the other elements that its readings use, and
 * a move watch from `observeMove`. On each signal it
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
  /** The size of each observed element when it was last measured. */
  let sizes = new Map<Element, Size>();
  let watch: MoveWatch | null = null;
  let destroyed = false;
  const animationSources = new Set<Element>();
  const signal = () => {
    if (!destroyed) {
      onSignal(tracker);
    }
  };
  // The first notice for each element comes after the measurement that
  // observed it, with the size that it read. Thus, measure again only for a
  // size that is new.
  const resizeObserver = new ResizeObserver((entries) => {
    const resized = entries.some(({ target, borderBoxSize }) => {
      const size = borderBoxSize.at(0);
      const known = sizes.get(target);
      return (
        size?.inlineSize !== known?.width || size?.blockSize !== known?.height
      );
    });
    if (resized) {
      signal();
    }
  });
  resizeObserver.observe(element, { box: "border-box" });
  let observed: readonly Element[] = [];

  /** Observes `next` besides the element itself, and keeps the size of each. */
  function observe(next: readonly Element[], context: MeasureContext) {
    for (const part of observed) {
      if (!next.includes(part)) {
        resizeObserver.unobserve(part);
      }
    }
    for (const part of next) {
      if (!observed.includes(part)) {
        resizeObserver.observe(part, { box: "border-box" });
      }
    }
    observed = next;
    sizes = new Map(next.map((part) => [part, context.rectOf(part)]));
    if (measured !== null) {
      sizes.set(element, measured.box);
    }
  }

  function rewatch(context: MeasureContext) {
    if (measured === null || animationSources.size > 0) {
      watch?.disconnect();
      watch = null;
      return;
    }
    const rootElement = measured.carrier.watchRoot(element, context);
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
    /**
     * The last measured box in page coordinates at the time of `clock`:
     * the element keeps its place on the carrier it was measured on. `null`
     * while it has no box, or while its carrier has no place.
     */
    boxAt(clock: CarrierClock): ElementBox | null {
      return measured === null
        ? null
        : measured.carrier.toPage(measured.local, clock);
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
     * Reads the element's box and the readings of its roles now, on the
     * carrier that it declares, and watches it from there. While an
     * animation it follows still runs, it queues itself again instead.
     */
    measure(context: MeasureContext) {
      if (destroyed) {
        return;
      }
      const box = element.isConnected
        ? readElementBox(element, context.styleOf)
        : null;
      measured = null;
      let parts: Element[] = [];
      if (box !== null) {
        const ref = declared ?? context.carrierOf(element);
        const carrier = carrierOf(resolveCarrier(ref, context));
        if (process.env.NODE_ENV !== "production") {
          checkDeclaredCarrier(element, ref, context);
        }
        const local = carrier.toLocal(box, context);
        if (local !== null) {
          const { readings, observed: used } = readRoles(
            element,
            context.rolesOf(element),
            box,
            context,
          );
          measured = { box, carrier, local, readings };
          parts = used;
        }
      }
      observe(parts, context);
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
      observed = [];
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
