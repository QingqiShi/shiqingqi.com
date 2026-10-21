import { useEffect, useRef, useState } from "react";

interface ElementBox {
  width: number;
  height: number;
  /**
   * How far the element reaches past its parent's content box on each side,
   * in pixels, read from its negative margins; 0 where it does not.
   */
  bleed: { left: number; right: number };
}

const NO_BLEED = { left: 0, right: 0 };

function measure(element: HTMLElement, width: number, height: number) {
  const { marginLeft, marginRight } = getComputedStyle(element);
  return {
    width,
    height,
    bleed: {
      left: Math.max(-parseFloat(marginLeft) || 0, 0),
      right: Math.max(-parseFloat(marginRight) || 0, 0),
    },
  };
}

function sameBox(a: ElementBox, b: ElementBox) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.bleed.left === b.bleed.left &&
    a.bleed.right === b.bleed.right
  );
}

/**
 * The content width and height of the element `ref` points at, and how far
 * it bleeds past its parent, kept current with a `ResizeObserver`. Both are 0
 * until the first measure.
 */
export function useElementSize<Element extends HTMLElement>() {
  const ref = useRef<Element>(null);
  const [box, setBox] = useState<ElementBox>({
    width: 0,
    height: 0,
    bleed: NO_BLEED,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number, height: number) => {
      const next = measure(element, width, height);
      setBox((current) => (sameBox(current, next) ? current : next));
    };
    update(element.clientWidth, element.clientHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      update(
        Math.round(entry.contentRect.width),
        Math.round(entry.contentRect.height),
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width: box.width, height: box.height, bleed: box.bleed };
}
