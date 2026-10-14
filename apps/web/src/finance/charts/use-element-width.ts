import { useEffect, useRef, useState } from "react";

interface ElementBox {
  width: number;
  /**
   * How far the element reaches past its parent's content box on each side,
   * in pixels, read from its negative margins; 0 where it does not.
   */
  bleed: { left: number; right: number };
}

const NO_BLEED = { left: 0, right: 0 };

function measure(element: HTMLElement, width: number): ElementBox {
  const { marginLeft, marginRight } = getComputedStyle(element);
  return {
    width,
    bleed: {
      left: Math.max(-parseFloat(marginLeft) || 0, 0),
      right: Math.max(-parseFloat(marginRight) || 0, 0),
    },
  };
}

function sameBox(a: ElementBox, b: ElementBox) {
  return (
    a.width === b.width &&
    a.bleed.left === b.bleed.left &&
    a.bleed.right === b.bleed.right
  );
}

/**
 * The content width of the element `ref` points at, and how far it bleeds
 * past its parent, kept current with a `ResizeObserver`. The width is 0
 * until the first measure.
 */
export function useElementWidth<Element extends HTMLElement>() {
  const ref = useRef<Element>(null);
  const [box, setBox] = useState<ElementBox>({ width: 0, bleed: NO_BLEED });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number) => {
      const next = measure(element, width);
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    update(element.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      update(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width: box.width, bleed: box.bleed };
}
