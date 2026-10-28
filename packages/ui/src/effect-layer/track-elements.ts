import type {
  EffectRegistry,
  RegisteredRegion,
} from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
  type CarrierClock,
  type ElementTracker,
  type MeasureContext,
} from "./create-element-tracker.ts";
import type { FrameScheduler } from "./create-frame-scheduler.ts";
import {
  createScrollRegion,
  type RegionPlace,
  type ScrollRegionWatch,
} from "./create-scroll-region.ts";
import {
  regionsOf,
  stickiesOf,
  type EffectCarrierRef,
} from "./resolve-carrier.ts";

/** Events whose target, with its relative, can enter or leave a state. */
const STATE_EVENTS = [
  "pointerover",
  "pointerout",
  "focusin",
  "focusout",
] as const;
/** Events after which `:active` can apply to the target and its ancestors. */
const PRESS_EVENTS = ["pointerdown", "pointerup", "pointercancel"] as const;
const ANIMATION_START_EVENTS = ["transitionrun", "animationstart"] as const;

/**
 * The outermost element that contains `target` and not `related`: the
 * elements that enter or leave `:hover` or `:focus-within` when a pointer
 * or the focus moves from `related` to `target`, or back. `null` when there
 * is none.
 *
 * @internal
 */
export function changedScope(
  target: EventTarget | null,
  related: EventTarget | null,
) {
  if (!(target instanceof Element)) {
    return null;
  }
  const relatedNode = related instanceof Node ? related : null;
  let scope: Element | null = null;
  for (
    let node: Element | null = target;
    node !== null && (relatedNode === null || !node.contains(relatedNode));
    node = node.parentElement
  ) {
    scope = node;
  }
  return scope;
}

/** Whether one element contains the other, or they are the same. */
function isRelated(a: Element, b: Element) {
  return a.contains(b) || b.contains(a);
}

/** Something that the next frame measures. */
interface Measurable {
  measure: (context: MeasureContext) => void;
}

/**
 * A clock for one frame, which also gives the place of each Scroll region,
 * read once.
 *
 * @internal
 */
export interface FrameClock extends CarrierClock {
  readonly regionPlace: (id: number) => RegionPlace | null;
}

/**
 * Gives each registered element a tracker, which measures the element again
 * only after a signal that it can have moved, resized or changed fill:
 *
 * - its own `ResizeObserver` reports a new size;
 * - its own `IntersectionObserver` reports a move, as `observeMove` explains;
 * - a scroll of a box around it that no Scroll region declares moves it;
 * - a sticky carrier that it is on sticks or lets go, as the stuck watch of
 *   `useEffectSticky` tells the registry;
 * - an attribute of it or an ancestor changes, which can change its style;
 * - the pointer or the focus enters or leaves it or an ancestor, or a press
 *   starts or ends on it, an ancestor or a descendant;
 * - a CSS transition or animation runs on it, an ancestor or a descendant:
 *   then it measures each frame until the animation stops;
 * - the colour scheme changes, or a style sheet loads, which can change any
 *   of them.
 *
 * A signalled tracker waits in a queue, and the next frame of `frames`
 * measures the queued ones together before it draws, then calls `onChange`.
 * A window scroll measures nothing: the registry keeps elements on the page
 * at their page position and elements on the viewport at their viewport
 * position. A scroll of a Scroll region measures nothing either: each
 * element in it keeps its place in the region's content box, and
 * `createScrollRegion` tracks where that box is. When a sticky box sticks or
 * lets go, the elements on it measure again together on their new carrier.
 * `readViewportBottom` reads the viewport's bottom edge, from which an
 * element on that edge is measured.
 * `onScroll` asks for a frame after each scroll of a Scroll region.
 *
 * @internal
 */
export function trackElements(
  registry: EffectRegistry,
  frames: FrameScheduler,
  onChange: () => void,
  readViewportBottom: () => number,
  onScroll: () => void = onChange,
) {
  let queued = new Set<Measurable>();
  const root = document.documentElement;
  const regions = new Map<number, ScrollRegionWatch>();

  /** The tracker of each element, then the scroller of each region. */
  function* allTrackers() {
    yield* registry.trackers();
    for (const watch of regions.values()) {
      yield watch.tracker;
    }
  }

  const chainOf = (tracker: ElementTracker): EffectCarrierRef =>
    tracker.declared ?? registry.carrierOf(tracker.element);

  const onSticky = (id: number, tracker: ElementTracker) =>
    stickiesOf(chainOf(tracker)).includes(id);

  function measureQueued() {
    const measured = queued;
    queued = new Set();
    const context = createMeasureContext(readViewportBottom, registry);
    for (const item of measured) {
      item.measure(context);
    }
    onChange();
  }

  function queue(item: Measurable) {
    queued.add(item);
    frames.read(measureQueued);
  }

  function signalWhere(test: (tracker: ElementTracker) => boolean) {
    for (const tracker of allTrackers()) {
      if (test(tracker)) {
        tracker.signal();
      }
    }
  }
  const signalAll = () => {
    signalWhere(() => true);
  };

  /** Follows the animations of `source` on the trackers `test` accepts. */
  function followWhere(
    source: Element,
    test: (tracker: ElementTracker) => boolean,
  ) {
    for (const tracker of allTrackers()) {
      if (test(tracker)) {
        tracker.follow(source);
      }
    }
  }

  // The root element's box is the root of each move watch in the document.
  // When its size changes, each of these watches is wrong.
  const rootObserver = new ResizeObserver(() => {
    signalWhere(({ measured }) => measured?.carrier.key === "page");
  });
  rootObserver.observe(root);

  const mutationObserver = new MutationObserver((records) => {
    let styleAdded = false;
    for (const record of records) {
      const { target } = record;
      if (record.type === "childList") {
        styleAdded ||= [...record.addedNodes].some(
          (node) => node instanceof HTMLStyleElement,
        );
      } else if (target instanceof Element) {
        // The change can start a transition before an event tells about it.
        followWhere(target, ({ element }) => target.contains(element));
      }
    }
    if (styleAdded) {
      signalAll();
    }
  });
  mutationObserver.observe(root, { attributes: true, subtree: true });
  mutationObserver.observe(document.head, { childList: true });

  // A nested scroller that no Scroll region declares moves the elements in
  // it under the compositor. Thus, measure them again, one frame late.
  function onNestedScroll({ target }: Event) {
    if (
      target instanceof Element &&
      registry.regionOfScroller(target) === undefined
    ) {
      signalWhere(({ element }) => target.contains(element));
    }
  }

  function onStateChange(event: Event) {
    const related =
      event instanceof MouseEvent || event instanceof FocusEvent
        ? event.relatedTarget
        : null;
    const scope = changedScope(event.target, related);
    if (scope !== null) {
      signalWhere(({ element }) => scope.contains(element));
    }
  }

  function onPress({ target }: Event) {
    if (target instanceof Element) {
      signalWhere(({ element }) => isRelated(target, element));
    }
  }

  function onAnimationStart(event: TransitionEvent | AnimationEvent) {
    const { target } = event;
    if (target instanceof Element && event.pseudoElement === "") {
      followWhere(target, ({ element }) => isRelated(target, element));
    }
  }

  // A resize can move the viewport's edges, and a breakpoint can change the
  // sticky offsets or make a sticky box fixed.
  function onResize() {
    signalWhere(
      (tracker) =>
        (tracker.measured !== null &&
          tracker.measured.carrier.key !== "page") ||
        stickiesOf(chainOf(tracker)).length > 0,
    );
  }

  function onLoad({ target }: Event) {
    if (target instanceof HTMLLinkElement) {
      signalAll();
    }
  }

  const listeners = new AbortController();
  const { signal } = listeners;
  const capture = { capture: true, passive: true, signal };
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", signalAll, { signal });
  window.addEventListener("resize", onResize, { passive: true, signal });
  document.addEventListener("scroll", onNestedScroll, capture);
  document.addEventListener("load", onLoad, capture);
  for (const type of STATE_EVENTS) {
    document.addEventListener(type, onStateChange, capture);
  }
  for (const type of PRESS_EVENTS) {
    document.addEventListener(type, onPress, capture);
  }
  for (const type of ANIMATION_START_EVENTS) {
    document.addEventListener(type, onAnimationStart, capture);
  }

  /** Signals each tracker on the Scroll region `id`. */
  function signalRegion(id: number) {
    signalWhere((tracker) => regionsOf(chainOf(tracker)).includes(id));
  }

  /**
   * Watches a Scroll region while it has both parts. The elements on it
   * measure again when the watch starts or stops, because they change
   * carrier.
   */
  function watchRegion(region: RegisteredRegion) {
    const { id } = region;
    const watch = createScrollRegion(region, {
      queue,
      onScroll,
      onResize: () => {
        signalRegion(id);
      },
    });
    regions.set(id, watch);
    signalRegion(id);
    return {
      destroy: () => {
        watch.destroy();
        if (regions.get(id) === watch) {
          regions.delete(id);
        }
        signalRegion(id);
      },
    };
  }

  const untrack = registry.track(
    (element) => createElementTracker(element, queue),
    (id) => {
      signalWhere((tracker) => onSticky(id, tracker));
    },
    watchRegion,
  );

  return {
    /**
     * A clock at this scroll, which reads the viewport's bottom edge and the
     * place of each Scroll region at most once.
     */
    clock(
      scrollX: number,
      scrollY: number,
      viewportBottom: () => number,
    ): FrameClock {
      const places = new Map<number, RegionPlace | null>();
      const regionPlace = (id: number) => {
        if (!places.has(id)) {
          // Stops a loop of regions.
          places.set(id, null);
          places.set(id, regions.get(id)?.place(clock) ?? null);
        }
        return places.get(id) ?? null;
      };
      const clock: FrameClock = {
        scrollX,
        scrollY,
        viewportBottom,
        regionOrigin: (id) => regionPlace(id)?.origin ?? null,
        regionPlace,
      };
      return clock;
    },
    destroy() {
      untrack();
      queued.clear();
      rootObserver.disconnect();
      mutationObserver.disconnect();
      listeners.abort();
    },
  };
}
