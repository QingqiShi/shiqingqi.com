import { captureOwnerStack, useEffect, useState, type RefObject } from "react";
import type { ScrollMaskOrientation } from "./use-scroll-mask.ts";

/** The prefix of the warning, which the e2e suites fail on. */
const SCROLL_MASK_FLUSH_WARNING = "[scroll mask]";

/** A box in viewport pixels, as `getBoundingClientRect` gives it. */
interface Box {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

type Side = "top" | "right" | "bottom" | "left";

/**
 * An edge where a Scroll mask stops short of its container.
 *
 * @internal
 */
export interface FlushViolation {
  readonly side: Side;
  /** How far the masked box stops short of the container's edge, in px. */
  readonly inset: number;
}

const sidesOf: Record<ScrollMaskOrientation, readonly [Side, Side]> = {
  horizontal: ["left", "right"],
  vertical: ["top", "bottom"],
};

/**
 * The edges on the fading axes where the masked box stops short of the
 * container's padding box by more than `tolerance`. A box that reaches
 * past the edge is flush.
 *
 * @internal
 */
export function flushViolations(
  masked: Box,
  container: Box,
  fadingAxes: readonly ScrollMaskOrientation[],
  tolerance = 1,
): FlushViolation[] {
  const insetOf: Record<Side, number> = {
    top: masked.top - container.top,
    right: container.right - masked.right,
    bottom: container.bottom - masked.bottom,
    left: masked.left - container.left,
  };
  return fadingAxes
    .flatMap((axis) => sidesOf[axis])
    .filter((side) => insetOf[side] > tolerance)
    .map((side) => ({ side, inset: Math.round(insetOf[side]) }));
}

const isTransparent = (paint: string) =>
  paint === "transparent" ||
  /^rgba\(.*,\s*0\)$/.test(paint) ||
  /\/\s*0\)$/.test(paint);

const sides: readonly Side[] = ["top", "right", "bottom", "left"];

/** Whether a box with this computed style paints a surface with an edge. */
function paintsSurface(style: CSSStyleDeclaration) {
  return (
    !isTransparent(style.backgroundColor) ||
    style.backgroundImage !== "none" ||
    style.boxShadow !== "none" ||
    (style.backdropFilter !== "" && style.backdropFilter !== "none") ||
    sides.some(
      (side) =>
        Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
        !["none", "hidden"].includes(
          style.getPropertyValue(`border-${side}-style`),
        ) &&
        !isTransparent(style.getPropertyValue(`border-${side}-color`)),
    )
  );
}

const clips = (style: CSSStyleDeclaration) =>
  style.overflowX !== "visible" || style.overflowY !== "visible";

/**
 * The nearest ancestor that paints a surface or clips, and its padding box.
 * A Scroll mask that paints its own surface fades at its own edge, and the
 * page itself has no edge to fade to, so either has no container.
 */
function visualContainerOf(masked: Element) {
  const scroller = masked.firstElementChild;
  if (
    paintsSurface(getComputedStyle(masked)) ||
    (scroller !== null && paintsSurface(getComputedStyle(scroller)))
  ) {
    return null;
  }
  for (
    let node = masked.parentElement;
    node !== null && node !== document.body;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node);
    if (!paintsSurface(style) && !clips(style)) continue;
    const rect = node.getBoundingClientRect();
    const border = (side: Side) =>
      Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) || 0;
    return {
      node,
      box: {
        top: rect.top + border("top"),
        right: rect.right - border("right"),
        bottom: rect.bottom - border("bottom"),
        left: rect.left + border("left"),
      },
    };
  }
  return null;
}

const describe = (element: Element) => {
  const id = element.id === "" ? "" : `#${element.id}`;
  const classes = [...element.classList].slice(0, 2).join(" ");
  return `<${element.localName}${id}${classes === "" ? "" : ` class="${classes}"`}>`;
};

// The e2e builds are production builds, so they turn the check on with this
// flag.
const isOn =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_UI_DEV_CHECKS === "1";

const warned = new WeakSet<Element>();

/** The component that renders the Scroll mask, from React's owner stack. */
function maskName() {
  // A production build of React has no `captureOwnerStack`.
  const stack =
    isOn && typeof captureOwnerStack === "function"
      ? captureOwnerStack()
      : null;
  const owner = stack?.match(/at (\w+)/)?.[1];
  return owner === undefined ? "ScrollMask" : `The ScrollMask in ${owner}`;
}

/**
 * In development, warns one time for each Scroll mask that fades at an edge
 * short of its container's visible edge. There the content blurs out into
 * the container's padding instead of running off the edge. The check runs
 * while a mask shows and again each time the masked box resizes.
 *
 * @internal
 */
export function useScrollMaskFlushCheck(
  maskedRef: RefObject<HTMLElement | null>,
  orientation: ScrollMaskOrientation,
  isFading: boolean,
) {
  const [name] = useState(maskName);
  useEffect(() => {
    const masked = maskedRef.current;
    if (!isOn || !isFading || masked === null || warned.has(masked)) return;
    if (typeof ResizeObserver === "undefined") return;
    const check = () => {
      if (warned.has(masked)) return;
      const rect = masked.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const container = visualContainerOf(masked);
      if (container === null) return;
      const violations = flushViolations(rect, container.box, [orientation]);
      if (violations.length === 0) return;
      warned.add(masked);
      const insets = violations
        .map(({ side, inset }) => `${String(inset)}px from the ${side}`)
        .join(" and ");
      console.warn(
        `${SCROLL_MASK_FLUSH_WARNING} ${name} fades on its ${orientation} axis, but it stops ${insets} edge of its container ${describe(container.node)}, so its content blurs out into the gap. Render it flush against its container's edge.`,
        masked,
        container.node,
      );
    };
    const observer = new ResizeObserver(check);
    observer.observe(masked);
    return () => {
      observer.disconnect();
    };
  }, [maskedRef, orientation, isFading, name]);
}
