import type { EffectRegistry } from "./create-effect-registry.ts";
import { readElementBox } from "./read-element-box.ts";
import type { EffectElementRecord } from "./types.ts";

/** Events after which a registered element can have moved or changed fill. */
const WAKE_EVENTS = [
  "scroll",
  "transitionrun",
  "animationstart",
  "focusin",
  "focusout",
] as const;

/** A node of the effect layer itself, whose changes move no element. */
function isOwnNode(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest("[data-effect-layer]") != null;
}

/**
 * Measures the registered elements once per frame, and calls `onChange`
 * when one of them can have moved, resized or changed fill since: a DOM
 * change anywhere, a resize, a theme change, a nested scroll, or a CSS
 * transition or animation starting. No observer reports an element that
 * moves without resizing, so each frame measures every element again.
 *
 * @internal
 */
export function trackElements(registry: EffectRegistry, onChange: () => void) {
  let observed = new Set<Element>();

  const resizeObserver = new ResizeObserver(onChange);
  const mutationObserver = new MutationObserver((mutations) => {
    if (mutations.some(({ target }) => !isOwnNode(target))) {
      onChange();
    }
  });
  mutationObserver.observe(document.documentElement, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeQuery.addEventListener("change", onChange);
  for (const type of WAKE_EVENTS) {
    document.addEventListener(type, onChange, { capture: true, passive: true });
  }

  function syncObserved() {
    const next = new Set(registry.elements().keys());
    for (const element of observed) {
      if (!next.has(element)) {
        resizeObserver.unobserve(element);
      }
    }
    for (const element of next) {
      if (!observed.has(element)) {
        resizeObserver.observe(element);
      }
    }
    observed = next;
    onChange();
  }
  const unsubscribe = registry.subscribe(syncObserved);
  syncObserved();

  return {
    /**
     * Every registered element with a box: those in the document first, then
     * the fixed ones, each group in registration order.
     */
    measure(scrollX: number, scrollY: number): EffectElementRecord[] {
      const styles = new Map<Element, CSSStyleDeclaration>();
      const styleOf = (element: Element) => {
        let style = styles.get(element);
        if (style === undefined) {
          style = getComputedStyle(element);
          styles.set(element, style);
        }
        return style;
      };
      const inDocument: EffectElementRecord[] = [];
      const fixed: EffectElementRecord[] = [];
      for (const [element, { id, roles }] of registry.elements()) {
        const box = element.isConnected
          ? readElementBox(element, scrollX, scrollY, styleOf)
          : null;
        if (box !== null) {
          (box.fixed ? fixed : inDocument).push({ ...box, id, element, roles });
        }
      }
      return [...inDocument, ...fixed];
    },
    /**
     * Whether a CSS transition or animation runs on a registered element or
     * an ancestor of one, so the next frame can find it moved or recoloured.
     */
    isAnimating() {
      if (observed.size === 0) {
        return false;
      }
      return document.getAnimations().some((animation) => {
        if (
          animation.playState !== "running" ||
          !(animation.effect instanceof KeyframeEffect) ||
          animation.effect.target === null
        ) {
          return false;
        }
        const { target } = animation.effect;
        for (const element of observed) {
          if (target.contains(element)) {
            return true;
          }
        }
        return false;
      });
    },
    destroy() {
      unsubscribe();
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      colorSchemeQuery.removeEventListener("change", onChange);
      for (const type of WAKE_EVENTS) {
        document.removeEventListener(type, onChange, { capture: true });
      }
    },
  };
}
