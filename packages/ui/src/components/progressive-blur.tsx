"use client";

import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { color } from "../tokens.stylex.ts";
import {
  buildBlurLayers,
  buildReachBlurLayers,
  LAYER_COUNT,
  type BlurGeometry,
} from "./progressive-blur-masks.ts";

interface ProgressiveBlurProps {
  /**
   * The floating element the blur radiates from. The ramp runs out of its
   * rect — measured, or `reach` in from the box's edges — so it needs no
   * direction; it renders above the layers and stays interactive while they,
   * and the box around them, let clicks through. The slot forces
   * `pointer-events: auto` on it, so a consumer that keeps a hidden floating
   * element mounted switches pointer events off again inside it.
   */
  children?: ReactNode;
  /**
   * Nominal blur radius in px at the strongest point, against the floating
   * element — the stacked layers compound to slightly above it. Clamped to
   * the cap (32).
   * @default 16
   */
  radius?: number;
  /**
   * Whether the blur is shown. Toggling melts the radius and the Wash away
   * and back; keep the element mounted while the exit plays.
   * @default true
   */
  isShown?: boolean;
  /**
   * How far the blur reaches past the floating element, in px, on every side.
   * Set it and the box is the element plus this margin: the root wraps the
   * element in flow instead of filling its positioned ancestor, and the ramp
   * is static. The layers sit in a `position: fixed` box placed by measuring
   * the element, so they add no scrollable overflow — a hidden floating
   * element near a viewport edge never adds sideways scroll — and no rounded
   * ancestor clips them. The box is placed against the viewport: an ancestor
   * that makes a containing block for `fixed` (a transform, a filter,
   * `contain`, `will-change: transform`) moves and clips it, the rule
   * `MenuButton`'s backdrop states for itself.
   */
  reach?: number;
  /**
   * StyleX styles merged over the component's own — the escape hatch for
   * placement and plane (position, inset, z-index).
   */
  css?: StyleProp;
}

/**
 * The page blurred around whatever floats, in place of dimming it — strongest
 * against the floating element, easing back to sharp further out on every
 * side. The consumer never states a direction: the floating element is passed
 * as `children`, and the ramp radiates out of its rect, running out to the
 * box's own edges before the page is sharp again.
 *
 * The box is defined one of two ways, never both: it fills the nearest
 * positioned ancestor and the element inside it is measured, or `reach` sets
 * it to the element plus that margin, so the ramp is static and only the
 * box's place follows the element.
 *
 * The blur belongs to the page rather than to the element: the layers are
 * siblings of the floating element, never ancestors of it, and the element
 * keeps its crisp edge. Blur softens sharpness but not brightness, so the
 * strongest layer also carries a faint Wash of the page background — anything
 * glaring behind the element is washed towards the canvas rather than left at
 * full contrast.
 *
 * The layers are hidden from assistive technology and transparent to pointer
 * events, so a dismissal click anywhere outside the floating element passes
 * through to whatever the consumer puts behind.
 *
 * Without `reach`, the measurement is taken on mount and again whenever the
 * box or the floating element resizes, or the element is swapped for another.
 * An element that moves without changing size — a transform, a keyframe
 * animation, the layout around it shifting — leaves the ramp centred where it
 * was until one of those happens. With `reach`, the box is placed on mount
 * and whenever the blur is shown, and while shown it follows every scroll,
 * every resize of the window, and every resize of the element; hidden, it
 * stays where it was, so the melt-out plays in place.
 *
 * Animates two ways. Toggling `isShown` animates the radius, melting the blur
 * away and back in place — a state change, so reduced motion keeps it,
 * shortened. Mounted and unmounted inside a view transition it cross-fades
 * with the root snapshot instead; leave this element outside any named
 * `ViewTransition` group, because a group captures the element apart from the
 * page it filters, and the blur would vanish for the length of the
 * transition. A named group on the floating element inside is fine — it is
 * captured on its own while the layers stay in the root capture.
 */
export function ProgressiveBlur({
  children,
  radius = 16,
  isShown = true,
  reach,
  css,
}: ProgressiveBlurProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<BlurGeometry | null>(null);
  const [isPlaced, setIsPlaced] = useState(false);
  const hasReach = reach !== undefined;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (hasReach || !root || !slot) return;

    const measure = () => {
      const next = measureGeometry(root, slot);
      // An empty measurement keeps the last rect rather than clearing it: a
      // floating element unmounting mid-melt would otherwise snap every mask
      // to uniform, and the ramp should melt away where the element was.
      if (next === null) return;
      setGeometry((current) =>
        isSameGeometry(current, next) ? current : next,
      );
    };

    measure();

    // Absent in jsdom, hence the guard — there the measurement stays null and
    // every layer masks to `none`.
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    for (const child of slot.children) resizeObserver.observe(child);

    // The floating element the consumer passes can be swapped for another
    // one without the box around it changing size, which no resize reports —
    // so the slot's child list is watched too, and the observed set follows.
    let mutationObserver: MutationObserver | undefined;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) resizeObserver.observe(node);
          }
          for (const node of mutation.removedNodes) {
            if (node instanceof Element) resizeObserver.unobserve(node);
          }
        }
        measure();
      });
      mutationObserver.observe(slot, { childList: true });
    }

    return () => {
      resizeObserver.disconnect();
      mutationObserver?.disconnect();
    };
  }, [hasReach]);

  // The box is written straight to the node rather than kept in state: nothing
  // else reads it, and a scroll gesture would otherwise re-render the floating
  // element every frame.
  useLayoutEffect(() => {
    const layers = layersRef.current;
    const slot = slotRef.current;
    if (reach === undefined || !layers || !slot) return;

    const place = () => {
      const rect = unionRect(slot.children);
      // An empty measurement keeps the last box, so a floating element that
      // unmounts mid-melt leaves the blur to melt away where it was.
      if (rect === null) return;
      placeFixedBox(layers, rect, reach);
      setIsPlaced(true);
    };

    place();
    if (!isShown) return;

    // Capture phase, so a scroller inside the page reports too: its scroll
    // event does not bubble.
    document.addEventListener("scroll", place, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", place);
    // Absent in jsdom, hence the guard.
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(place);
    for (const child of slot.children) resizeObserver?.observe(child);

    return () => {
      document.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
      resizeObserver?.disconnect();
    };
  }, [reach, isShown]);

  const layers = hasReach
    ? buildReachBlurLayers({ reach, radius, isShown })
    : buildBlurLayers({ geometry, radius, isShown });

  return (
    <div ref={rootRef} css={[styles.root, hasReach && styles.reachRoot, css]}>
      <div
        ref={layersRef}
        css={[
          styles.layers,
          hasReach && styles.reachLayers,
          hasReach && !isPlaced && styles.unplaced,
        ]}
      >
        {layers.map(({ filter, mask }, index) => (
          <div
            key={index}
            aria-hidden="true"
            css={[
              styles.layer,
              dynamicStyles.layer(filter, mask),
              !isShown && styles.hidden,
              index === LAYER_COUNT - 1 && isShown && styles.wash,
            ]}
          />
        ))}
      </div>
      <span ref={slotRef} css={styles.slot}>
        {children}
      </span>
    </div>
  );
}

interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The union of the elements' viewport rects — `null` when there are none, or
 * the union is empty.
 */
function unionRect(elements: HTMLCollection): ViewportRect | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}

/**
 * The root's box and the union of the floating children's boxes within it.
 * `null` when either is missing or empty, which leaves the layers unmasked.
 */
function measureGeometry(root: HTMLElement, slot: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) return null;

  const rect = unionRect(slot.children);
  if (rect === null) return null;

  // Rounded so a subpixel jitter doesn't rewrite every mask string.
  return {
    width: Math.round(rootRect.width),
    height: Math.round(rootRect.height),
    left: Math.round(rect.left - rootRect.left),
    top: Math.round(rect.top - rootRect.top),
    right: Math.round(rect.right - rootRect.left),
    bottom: Math.round(rect.bottom - rootRect.top),
  };
}

function isSameGeometry(a: BlurGeometry | null, b: BlurGeometry) {
  return (
    a !== null &&
    a.width === b.width &&
    a.height === b.height &&
    a.left === b.left &&
    a.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom
  );
}

/**
 * Writes the fixed box — the element's rect plus `reach` on every side — to
 * the node. A fixed box resolves against the viewport, or against the nearest
 * ancestor with a transform, a filter or `contain`; the box is put at that
 * origin first and read back, so the offsets land right under either.
 */
function placeFixedBox(box: HTMLElement, rect: ViewportRect, reach: number) {
  box.style.top = "0px";
  box.style.left = "0px";
  const origin = box.getBoundingClientRect();
  box.style.top = `${String(rect.top - reach - origin.top)}px`;
  box.style.left = `${String(rect.left - reach - origin.left)}px`;
  box.style.width = `${String(rect.right - rect.left + 2 * reach)}px`;
  box.style.height = `${String(rect.bottom - rect.top + 2 * reach)}px`;
}

const styles = stylex.create({
  // The box fills its nearest positioned ancestor by default. A consumer's own
  // placement arrives through the `css` prop and merges over this, so the root
  // carries no `className` or `style` prop of its own — either would overwrite
  // what the css-prop transform generates and leave the box unstyled.
  root: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  // With `reach`, the root sits in flow around the floating element instead of
  // filling a positioned ancestor.
  reachRoot: {
    position: "relative",
    inset: "auto",
  },
  // The wrapper around the layers. Its box is the root's box, and the layers
  // fill it.
  layers: {
    position: "absolute",
    inset: 0,
  },
  // With `reach`, the wrapper is a fixed box: the element's viewport rect plus
  // `reach` on every side, written to the node by measurement. Fixed rather
  // than absolute, because the box hangs `reach` past the root: an absolute
  // box would grow every scrollable ancestor's area for that overhang, and
  // Chromium drops a `backdrop-filter` layer's mask where the layer overflows
  // an ancestor's rounded `overflow` clip — a fixed box escapes both. The
  // physical insets are what the measurement writes; a transformed ancestor
  // becomes the box's containing block, and clips it again.
  reachLayers: {
    position: "fixed",
    inset: "auto",
  },
  // No box yet, so nothing to show: the first paint comes before the first
  // measurement. The layers inherit it. Never on the root, which would hold
  // the floating element unrendered.
  unplaced: {
    visibility: "hidden",
  },
  hidden: {
    visibility: "hidden",
  },
  // The show/hide animation runs on the radius, not on a fade: opacity below 1
  // on an ancestor makes that ancestor a backdrop root, cutting the page off
  // from the filters beneath it, so a cross-fade would drop the blur for its
  // whole duration. Animating the radius melts the blur away in place instead.
  // The same trap rules out ever wrapping the layers and the children together
  // in anything carrying opacity, a filter, or a mask.
  //
  // `visibility` sits on each layer rather than on the root: a hidden root
  // would hold the floating element unrendered at the moment a view
  // transition captures its new state, and an uncaptured element loses its
  // enter animation. Transitioning it rather than flipping keeps the layers
  // visible until the melt ends, and the compositor stops paying afterwards.
  // No base value of its own, so an unplaced wrapper's `hidden` reaches the
  // layers by inheritance.
  layer: {
    position: "absolute",
    inset: 0,
    // The two per-axis ramps multiply rather than add, so the corners round
    // off and the blur radiates out of the element's rect.
    maskComposite: "intersect",
    transition: {
      default: `backdrop-filter ${duration._300} ${easing.ease}, background-color ${duration._300} ${easing.ease}, visibility ${duration._300}`,
      [motionConstants.REDUCED_MOTION]: `backdrop-filter ${duration._150} ${easing.ease}, background-color ${duration._150} ${easing.ease}, visibility ${duration._150}`,
    },
  },
  // `display: contents` keeps the floating element in the consumer's own
  // layout, and `pointer-events` inherits down to it from here — so the root
  // and the layers stay click-through while the element itself does not.
  slot: {
    display: "contents",
    pointerEvents: "auto",
  },
  // Blur alone leaves brightness untouched, so something glaring behind the
  // element would still glare through it. The strongest layer carries a faint
  // Wash towards the canvas — its own mask ramps the Wash in alongside the
  // blur, and the background-color transition melts it out with `isShown`.
  wash: {
    backgroundColor: `color-mix(in srgb, ${color.bgCanvasFade} 25%, transparent)`,
  },
});

const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
});
