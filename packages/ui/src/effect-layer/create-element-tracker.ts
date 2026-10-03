import { observeMove, type Edges, type MoveWatch } from "./observe-move.ts";
import {
  isInSticky,
  readElementBox,
  type ElementBox,
} from "./read-element-box.ts";

/** The last measurement of a registered element. */
interface MeasuredElement {
  /** In viewport coordinates, as it was measured. */
  readonly box: ElementBox;
  /** The box in page coordinates, from the scroll it was measured at. */
  readonly pageBox: ElementBox;
  /**
   * It, or an ancestor, has `position: sticky`, so a window scroll can move
   * it in the page.
   */
  readonly sticky: boolean;
}

/**
 * What the elements measured in one frame share: the scroll, the computed
 * styles of their ancestors, whether an animation source still runs, and
 * the roots of their move watches.
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
}

function isRunning(animation: Animation) {
  return animation.pending || animation.playState === "running";
}

/**
 * A context that reads each computed style, each animation source and each
 * root once. Drop it after the frame, so that it keeps no style alive.
 *
 * @internal
 */
export function createMeasureContext(): MeasureContext {
  const styles = new Map<Element, CSSStyleDeclaration>();
  const animating = new Map<Element, boolean>();
  const root = document.documentElement;
  let rootEdges: Edges | null = null;
  let viewportEdges: Edges | null = null;
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    styleOf: (element) => {
      let style = styles.get(element);
      if (style === undefined) {
        style = getComputedStyle(element);
        styles.set(element, style);
      }
      return style;
    },
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
        viewportEdges ??= {
          left: 0,
          top: 0,
          right: root.clientWidth,
          bottom: root.clientHeight,
        };
        return viewportEdges;
      }
      rootEdges ??= root.getBoundingClientRect();
      return rootEdges;
    },
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
    const { box } = measured;
    const area = {
      rect: edgesOf(box),
      fixed: box.fixed,
      root: context.watchRoot(box.fixed),
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
    /**
     * The last measured box in page coordinates at this scroll: an element
     * in the document keeps its page position, and a fixed element keeps its
     * viewport position. `null` while it has no box.
     */
    boxAt(scrollX: number, scrollY: number): ElementBox | null {
      if (measured === null) {
        return null;
      }
      const { box, pageBox } = measured;
      return box.fixed
        ? { ...box, x: box.x + scrollX, y: box.y + scrollY }
        : pageBox;
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
     * Reads the element's box now, and watches it from there. While an
     * animation it follows still runs, it queues itself again instead.
     */
    measure(context: MeasureContext) {
      if (destroyed) {
        return;
      }
      const box = element.isConnected
        ? readElementBox(element, context.styleOf)
        : null;
      measured = box && {
        box,
        pageBox: {
          ...box,
          x: box.x + context.scrollX,
          y: box.y + context.scrollY,
        },
        sticky: isInSticky(element, context.styleOf),
      };
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
