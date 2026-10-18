import { checkDeclaredCarrier } from "./check-declared-carrier.ts";
import { observeMove, type Edges, type MoveWatch } from "./observe-move.ts";
import { readElementBox, type ElementBox } from "./read-element-box.ts";
import {
  PAGE_CARRIER,
  resolveCarrier,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";
import type { EffectCanvas } from "./types.ts";

/** The last measurement of a registered element. */
interface MeasuredElement {
  /** In viewport coordinates, as it was measured. */
  readonly box: ElementBox;
  /** The box in page coordinates, from the scroll it was measured at. */
  readonly pageBox: ElementBox;
  /**
   * The `<canvas>` element of the carrier it was measured on, which tells
   * how its box moves with a scroll.
   */
  readonly canvas: EffectCanvas;
  /**
   * The viewport's bottom edge in viewport coordinates when it was measured,
   * for a box on the bottom `<canvas>` element; else 0.
   */
  readonly viewportBottom: number;
}

/**
 * Where the carriers of the elements come from: the carrier that each
 * element declares, the box of each sticky carrier, and whether it is stuck.
 *
 * @internal
 */
export interface CarrierLookup {
  readonly carrierOf: (element: Element) => EffectCarrierRef;
  readonly stickyBox: (id: number) => Element | null;
  /** Whether the sticky carrier `id` is stuck, as its stuck watch read it. */
  readonly isStuck: (id: number) => boolean;
}

const PAGE_ONLY: CarrierLookup = {
  carrierOf: () => PAGE_CARRIER,
  stickyBox: () => null,
  isStuck: () => false,
};

/**
 * What the elements measured in one frame share: the scroll, the computed
 * styles of their ancestors, whether an animation source still runs, the
 * roots of their move watches, and whether each sticky carrier is stuck.
 *
 * @internal
 */
export interface MeasureContext {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly styleOf: (element: Element) => CSSStyleDeclaration;
  /** Whether a CSS transition or animation still runs on `source`. */
  readonly isAnimating: (source: Element) => boolean;
  /** The viewport for a fixed element, or the root element's border box. */
  readonly watchRoot: (fixed: boolean) => Edges;
  /** The viewport's bottom edge now, in viewport coordinates. */
  readonly viewportBottom: () => number;
  /** The carrier that the element declares. */
  readonly carrierOf: (element: Element) => EffectCarrierRef;
  /** The box of the sticky carrier `id`, or `null`. */
  readonly stickyBox: (id: number) => Element | null;
  /** Whether the sticky carrier `id` is stuck, as its stuck watch read it. */
  readonly isStuck: (id: number) => boolean;
}

function isRunning(animation: Animation) {
  return animation.pending || animation.playState === "running";
}

/**
 * A context that reads each computed style, each animation source, each
 * root and the viewport's bottom edge once. Drop it after
 * the frame, so that it keeps no style alive.
 *
 * @internal
 */
export function createMeasureContext(
  readViewportBottom: () => number,
  { carrierOf, stickyBox, isStuck }: CarrierLookup = PAGE_ONLY,
): MeasureContext {
  const styles = new Map<Element, CSSStyleDeclaration>();
  const animating = new Map<Element, boolean>();
  const root = document.documentElement;
  let rootEdges: Edges | null = null;
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
  const readViewport = () => {
    viewportEdges ??= {
      left: 0,
      top: 0,
      right: root.clientWidth,
      bottom: root.clientHeight,
    };
    return viewportEdges;
  };
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    styleOf,
    isAnimating: (source) => {
      let running = animating.get(source);
      if (running === undefined) {
        running = source.isConnected && source.getAnimations().some(isRunning);
        animating.set(source, running);
      }
      return running;
    },
    watchRoot: (fixed) => {
      if (fixed) {
        return readViewport();
      }
      rootEdges ??= root.getBoundingClientRect();
      return rootEdges;
    },
    viewportBottom: () => {
      viewportBottom ??= readViewportBottom();
      return viewportBottom;
    },
    carrierOf,
    stickyBox,
    isStuck,
  };
}

function edgesOf({ x, y, width, height }: ElementBox): Edges {
  return { left: x, top: y, right: x + width, bottom: y + height };
}

/**
 * Tracks one registered element: it keeps the element's last measurement
 * and the observers that tell when it can have changed, its own
 * `ResizeObserver` and a move watch from `observeMove`. On each signal it
 * calls `onSignal`, which queues it to measure again before the next paint.
 * A new tracker is queued at once.
 *
 * @internal
 */
export function createElementTracker(
  element: Element,
  onSignal: (tracker: ElementTracker) => void,
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

  function rewatch(context: MeasureContext) {
    if (measured === null || animationSources.size > 0) {
      watch?.disconnect();
      watch = null;
      return;
    }
    const fixed = measured.canvas !== "scroll";
    const area = {
      rect: edgesOf(measured.box),
      fixed,
      root: context.watchRoot(fixed),
    };
    if (watch?.covers(area) === true) {
      return;
    }
    watch?.disconnect();
    watch = observeMove(element, area, signal);
  }

  const tracker = {
    element,
    get measured() {
      return measured;
    },
    /** How many times it has measured the element. */
    get measurement() {
      return measurement;
    },
    /**
     * The last measured box in page coordinates at this scroll, from the
     * carrier it was measured on: an element on the page keeps its page
     * position, an element on the viewport keeps its viewport position, and
     * an element on the viewport's bottom edge keeps its distance from that
     * edge, which `viewportBottom` reads now. `null` while it has no box.
     */
    boxAt(
      scrollX: number,
      scrollY: number,
      viewportBottom: () => number,
    ): ElementBox | null {
      if (measured === null) {
        return null;
      }
      const { box, pageBox, canvas } = measured;
      if (canvas === "scroll") {
        return pageBox;
      }
      const shift =
        canvas === "fixedBottom"
          ? viewportBottom() - measured.viewportBottom
          : 0;
      return { ...box, x: box.x + scrollX, y: box.y + scrollY + shift };
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
      if (box === null) {
        measured = null;
      } else {
        const carrier = context.carrierOf(element);
        const canvas = resolveCarrier(carrier, context.isStuck);
        if (process.env.NODE_ENV !== "production") {
          checkDeclaredCarrier(element, carrier, context);
        }
        measured = {
          box,
          pageBox: {
            ...box,
            x: box.x + context.scrollX,
            y: box.y + context.scrollY,
          },
          canvas,
          viewportBottom:
            canvas === "fixedBottom" ? context.viewportBottom() : 0,
        };
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
