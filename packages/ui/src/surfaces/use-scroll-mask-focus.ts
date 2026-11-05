import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { getScrollBehavior } from "../get-scroll-behavior.ts";

interface ScrollMaskFocusOptions {
  scrollRef: RefObject<HTMLElement | null>;
  startChromeRef: RefObject<HTMLElement | null>;
  endChromeRef: RefObject<HTMLElement | null>;
  isHorizontal: boolean;
  hasChrome: boolean;
  hasStartChrome: boolean;
  hasEndChrome: boolean;
}

/**
 * Keeps a focused control of a `ScrollMask` in view, and tells whether the
 * region must not snap while it does.
 *
 * @internal
 */
export function useScrollMaskFocus({
  scrollRef,
  startChromeRef,
  endChromeRef,
  isHorizontal,
  hasChrome,
  hasStartChrome,
  hasEndChrome,
}: ScrollMaskFocusOptions) {
  // The scroll padding that keeps scrolled-to content clear of the chrome
  // covers the chrome slots themselves, and a sticky slot never moves, so the
  // reveal that follows any focus inside one always scrolls the region and is
  // never satisfied. `preventScroll` cannot reach
  // native focus (Tab, a click), so this undoes the reveal instead: at
  // `focusin` the reveal has moved the scroll position, but its `scroll`
  // event has not fired yet, so the last event-reported position is still the
  // pre-focus one, and restoring it before paint shows no jump. Sticky chrome
  // is always in view, so the restore never hides the focused control.
  //
  // Outside the chrome, Chromium does not scroll to an element that gets
  // focus while it is partly in view, so a control at the scroll edge stays
  // half hidden and its focus ring is cut. On keyboard focus, this scrolls
  // the control fully into view. Mandatory snap then pulls the region back to
  // the nearest snap point and hides part of the control again, so the region
  // does not snap until focus leaves it.
  const [keyboardFocusTarget, setKeyboardFocusTarget] =
    useState<Element | null>(null);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const readScroll = () =>
      isHorizontal ? scroller.scrollLeft : scroller.scrollTop;
    let restingScroll = readScroll();
    const onScroll = () => {
      restingScroll = readScroll();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target === scroller) return;
      const inChrome = [startChromeRef.current, endChromeRef.current].some(
        (slot) => slot?.contains(target),
      );
      if (inChrome) {
        if (isHorizontal) scroller.scrollLeft = restingScroll;
        else scroller.scrollTop = restingScroll;
        return;
      }
      if (target.matches(":focus-visible")) setKeyboardFocusTarget(target);
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && scroller.contains(next)) return;
      setKeyboardFocusTarget(null);
    };
    if (hasChrome) {
      scroller.addEventListener("scroll", onScroll, { passive: true });
    }
    scroller.addEventListener("focusin", onFocusIn);
    scroller.addEventListener("focusout", onFocusOut);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("focusin", onFocusIn);
      scroller.removeEventListener("focusout", onFocusOut);
    };
  }, [
    scrollRef,
    startChromeRef,
    endChromeRef,
    hasChrome,
    hasStartChrome,
    hasEndChrome,
    isHorizontal,
  ]);
  // A layout effect, so the snap is already off when the reveal starts.
  useLayoutEffect(() => {
    keyboardFocusTarget?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: getScrollBehavior(),
    });
  }, [keyboardFocusTarget]);

  return keyboardFocusTarget !== null;
}
