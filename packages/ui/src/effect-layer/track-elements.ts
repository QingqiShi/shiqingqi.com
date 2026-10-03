import type { EffectRegistry } from "./create-effect-registry.ts";
import {
  createElementTracker,
  createMeasureContext,
  type ElementTracker,
} from "./create-element-tracker.ts";
import type { FrameScheduler } from "./create-frame-scheduler.ts";

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

/**
 * Gives each registered element a tracker, which measures the element again
 * only after a signal that it can have moved, resized or changed fill:
 *
 * - its own `ResizeObserver` reports a new size;
 * - its own `IntersectionObserver` reports a move, as `observeMove` explains;
 * - a scroll moves it: a nested scroll of a box around it, or a window
 *   scroll when it is sticky;
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
 * A window scroll measures nothing: the registry keeps elements in the
 * document at their page position and fixed elements at their viewport
 * position.
 *
 * @internal
 */
export function trackElements(
  registry: EffectRegistry,
  frames: FrameScheduler,
  onChange: () => void,
) {
  let queued = new Set<ElementTracker>();
  const root = document.documentElement;

  function measureQueued() {
    const trackers = queued;
    queued = new Set();
    const context = createMeasureContext();
    for (const tracker of trackers) {
      tracker.measure(context);
    }
    onChange();
  }

  function queue(tracker: ElementTracker) {
    queued.add(tracker);
    frames.read(measureQueued);
  }

  function signalWhere(test: (tracker: ElementTracker) => boolean) {
    for (const tracker of registry.trackers()) {
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
    for (const tracker of registry.trackers()) {
      if (test(tracker)) {
        tracker.follow(source);
      }
    }
  }

  // The root element's box is the root of each move watch in the document.
  // When its size changes, each of these watches is wrong.
  const rootObserver = new ResizeObserver(() => {
    signalWhere(({ measured }) => measured?.box.fixed === false);
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

  function onScroll({ target }: Event) {
    if (target === document) {
      signalWhere(({ measured }) => measured?.sticky === true);
    } else if (target instanceof Element) {
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

  function onResize() {
    signalWhere(({ measured }) => measured?.box.fixed === true);
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
  document.addEventListener("scroll", onScroll, capture);
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

  const untrack = registry.track((element) =>
    createElementTracker(element, queue),
  );

  return {
    destroy() {
      untrack();
      queued.clear();
      rootObserver.disconnect();
      mutationObserver.disconnect();
      listeners.abort();
    },
  };
}
