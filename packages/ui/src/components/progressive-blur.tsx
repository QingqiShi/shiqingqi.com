"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StyleProp } from "../css-prop-types.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import { color } from "../tokens.stylex.ts";
import { observeChildren } from "../utils/observe-children.ts";
import {
  buildBlurLayers,
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
   * and back; keep the element mounted while the exit plays. A slot measured
   * without a floating element in it stays melted, whatever this says.
   * @default true
   */
  isShown?: boolean;
  /**
   * How far the blur reaches past the floating element, in px, on every side.
   * Set it and the box is the element plus this margin: the root wraps the
   * element in flow instead of filling its positioned ancestor, and the
   * element's rect follows from the box by construction, so measuring the
   * element places and sizes the box in one go. The layers sit in a
   * `position: fixed` box placed by that measurement, so they add no
   * scrollable overflow — a hidden floating element near a viewport edge never
   * adds sideways scroll — and no squircle overflow clip on an ancestor strips
   * their masks (see `MaskBand`). The box is placed against the viewport: an
   * ancestor that makes a containing block for `fixed` (a transform, a filter,
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
 * it to the element plus that margin, which puts the element's rect `reach` in
 * from every edge. Either way the masks are drawn at the box's size, so both
 * wait on a measurement and blur the whole box uniformly until one lands.
 *
 * Without `reach`, the box is the root's parent, and the root, the layers'
 * wrapper and each layer take its corners by inheritance, so the blur ends
 * where a rounded box ends. The box must not clip: its content sits beside
 * the blur rather than above it, so it needs no clip for the blur's sake, and
 * a squircle overflow clip on it or on any ancestor strips the layers' masks
 * (see `MaskBand`).
 *
 * The blur belongs to the page rather than to the element: the layers are
 * siblings of the floating element, never ancestors of it, and the element
 * keeps its crisp edge. Blur softens sharpness but not brightness, so every
 * layer also carries a share of a faint Wash of the page background —
 * anything glaring behind the element is washed towards the canvas rather
 * than left at full contrast, and the Wash eases out band by band with the
 * blur.
 *
 * The layers are hidden from assistive technology and transparent to pointer
 * events, so a dismissal click anywhere outside the floating element passes
 * through to whatever the consumer puts behind.
 *
 * The floating element is watched either way, shown or not: every resize of
 * it, and every change to the slot's child list, which no resize reports.
 * Without `reach`, the measurement is taken on mount and again whenever the
 * box or the element resizes, or the element is swapped for another. An
 * element that moves without changing size — a transform, a keyframe
 * animation, the layout around it shifting — leaves the ramp centred where it
 * was until one of those happens. With `reach`, the box is placed on mount
 * and whenever the blur is shown, and while shown it follows every scroll and
 * every resize of the window; hidden, it stays where it was, so the melt-out
 * plays in place.
 *
 * An element that unmounts, or shrinks to nothing, after the box has been
 * measured melts the blur out where it was: `isShown` on its own never blurs
 * the page around nothing. A slot never measured with an element in it keeps
 * the uniform first-paint blur instead, which is all a server render can show.
 * One that appears is measured, placed, and shown.
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
  const offsetRef = useRef<BoxOffset | null>(null);
  const [geometry, setGeometry] = useState<BlurGeometry | null>(null);
  const [boxSize, setBoxSize] = useState<BoxSize | null>(null);
  const [isElementMissing, setIsElementMissing] = useState(false);
  const hasReach = reach !== undefined;
  // A slot that has never been measured with an element in it keeps the
  // uniform first-paint blur; one that lost the element it had melts out.
  const isBlurShown =
    isShown &&
    !(isElementMissing && (hasReach ? boxSize !== null : geometry !== null));

  useLayoutEffect(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (hasReach || !root || !slot) return;

    const measure = () => {
      const rect = unionRect(slot.children);
      setIsElementMissing(rect === null);
      // An empty measurement keeps the last rect rather than clearing it: a
      // floating element unmounting mid-melt would otherwise snap every mask
      // to uniform, and the ramp should melt away where the element was.
      if (rect === null) return;
      const next = measureGeometry(root, rect);
      if (next === null) return;
      setGeometry((current) =>
        isSameGeometry(current, next) ? current : next,
      );
    };

    measure();

    // Absent in jsdom, hence the guard — there the measurement stays null and
    // every layer masks to `none`.
    const rootObserver =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    rootObserver?.observe(root);
    const unobserveSlot = observeChildren(slot, measure);

    return () => {
      rootObserver?.disconnect();
      unobserveSlot();
    };
  }, [hasReach]);

  // The box's place is written straight to the node rather than kept in
  // state: nothing else reads it, and a scroll gesture would otherwise
  // re-render the floating element every frame. Its size does reach state,
  // because the masks are drawn at the box's size — but only when it changes,
  // which scrolling never does.
  const place = useCallback(() => {
    const layers = layersRef.current;
    const slot = slotRef.current;
    if (reach === undefined || !layers || !slot) return;

    const rect = unionRect(slot.children);
    setIsElementMissing(rect === null);
    // An empty measurement keeps the last box, so a floating element that
    // unmounts mid-melt leaves the blur to melt away where it was.
    if (rect === null) return;

    offsetRef.current = placeFixedBox(layers, rect, reach, offsetRef.current);
    // Rounded so a subpixel jitter doesn't rewrite five SVG masks.
    const size = {
      width: Math.round(rect.right - rect.left + 2 * reach),
      height: Math.round(rect.bottom - rect.top + 2 * reach),
    };
    setBoxSize((current) => (isSameSize(current, size) ? current : size));
  }, [reach]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (reach === undefined || !slot) return;

    place();
    // The element is watched shown or not, so one that goes melts the blur out.
    return observeChildren(slot, place);
  }, [reach, place]);

  useLayoutEffect(() => {
    if (reach === undefined || !isShown) return;

    // Placed again on being shown: while hidden, nothing followed the page.
    place();

    // Momentum scrolling delivers events faster than the compositor paints, so
    // placing per event would force a document-wide layout each time. Scroll
    // fires before the frame's rendering step, so this still lands in the same
    // paint.
    let frame = 0;
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        place();
      });
    };

    // Capture phase, so a scroller inside the page reports too: its scroll
    // event does not bubble.
    document.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);

    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [reach, isShown, place]);

  const layers = buildBlurLayers({
    geometry: hasReach ? reachGeometry(reach, boxSize) : geometry,
    radius,
    isShown: isBlurShown,
  });
  // The fixed box of `reach` mode is square, so only the box-filling mode
  // inherits corners.
  const boxCorners = !hasReach && styles.corners;

  return (
    <div
      ref={rootRef}
      css={[styles.root, hasReach && styles.reachRoot, boxCorners, css]}
    >
      <div
        ref={layersRef}
        css={[
          styles.layers,
          hasReach && styles.reachLayers,
          boxCorners,
          hasReach && boxSize === null && styles.unplaced,
          hasReach &&
            boxSize !== null &&
            dynamicStyles.boxSize(boxSize.width, boxSize.height),
        ]}
      >
        {layers.map(({ filter, mask }, index) => (
          <div
            key={index}
            aria-hidden="true"
            css={[
              styles.layer,
              hasReach && styles.reachLayer,
              boxCorners,
              dynamicStyles.layer(filter, mask),
              !isBlurShown && styles.hidden,
              isBlurShown && styles.wash,
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

/** The blur's own box, in px. */
interface BoxSize {
  width: number;
  height: number;
}

/** The offsets a `reach` box was last placed at, in px. */
interface BoxOffset {
  top: number;
  left: number;
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
 * The root's box and the floating element's rect within it. `null` when the
 * root has no box, which leaves the layers unmasked.
 */
function measureGeometry(root: HTMLElement, rect: ViewportRect) {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) return null;

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

/**
 * The geometry of a `reach` box, whose floating element is `reach` in from
 * every edge by construction. `null` until the box has been placed — nothing
 * is measured server-side.
 */
function reachGeometry(
  reach: number,
  box: BoxSize | null,
): BlurGeometry | null {
  if (box === null) return null;
  return {
    width: box.width,
    height: box.height,
    left: reach,
    top: reach,
    right: box.width - reach,
    bottom: box.height - reach,
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

function isSameSize(a: BoxSize | null, b: BoxSize) {
  return a !== null && a.width === b.width && a.height === b.height;
}

/**
 * Writes the fixed box's corner — the element's rect less `reach` — to the
 * node, and returns the offsets it wrote. A fixed box resolves against the
 * viewport, or against the nearest ancestor with a transform, a filter or
 * `contain`, so the offsets are taken from that origin.
 */
function placeFixedBox(
  box: HTMLElement,
  rect: ViewportRect,
  reach: number,
  applied: BoxOffset | null,
): BoxOffset {
  const origin = containingBlockOrigin(box, applied);
  const offset = {
    top: rect.top - reach - origin.top,
    left: rect.left - reach - origin.left,
  };
  box.style.top = `${String(offset.top)}px`;
  box.style.left = `${String(offset.left)}px`;
  return offset;
}

/**
 * Where the box's containing block starts. A box already placed is read where
 * it stands and the offsets written to it subtracted, so a containing block
 * that moves with the page stays right and no placement writes then reads.
 */
function containingBlockOrigin(box: HTMLElement, applied: BoxOffset | null) {
  // The first placement has nothing to subtract, so the box goes to the origin
  // and is read there.
  if (applied === null) {
    box.style.top = "0px";
    box.style.left = "0px";
  }
  const placed = box.getBoundingClientRect();
  return {
    top: placed.top - (applied?.top ?? 0),
    left: placed.left - (applied?.left ?? 0),
  };
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
  // Without `reach`, the root fills its parent and takes the parent's corners;
  // the wrapper and the layers inherit them in turn, so each layer clips its
  // own backdrop to the box's corners and nothing above them has to.
  corners: {
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // With `reach`, the wrapper is a fixed point: the top-left corner of the
  // element's viewport rect less `reach`, written to the node by measurement,
  // with the layers hanging off it at the box's size. Fixed rather than
  // absolute, because the box hangs `reach` past the root: an absolute box
  // would grow every scrollable ancestor's area for that overhang, and would
  // sit under whatever squircle overflow clip the page around the element
  // carries, which strips the layers' masks — a fixed box escapes both. The
  // physical insets are what the measurement writes; a transformed ancestor
  // becomes the box's containing block, and clips it again.
  //
  // It keeps no size of its own, so Safari on iOS walks past it instead of
  // flattening the status bar — see "Progressive blur" in `CONTEXT.md`.
  reachLayers: {
    position: "fixed",
    inset: "auto",
    inlineSize: 0,
    blockSize: 0,
  },
  // A layer in a `reach` box takes the box's size from the wrapper, which
  // states it as two custom properties and stays a point itself.
  reachLayer: {
    inlineSize: "var(--blur-box-inline-size, 0px)",
    blockSize: "var(--blur-box-block-size, 0px)",
    insetInlineEnd: "auto",
    insetBlockEnd: "auto",
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
    // Each mask is one SVG image drawn at the box's own size, so it maps onto
    // the layer 1:1 and covers it exactly once.
    maskSize: "100% 100%",
    maskRepeat: "no-repeat",
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
  // element would still glare through it. Every layer carries a share of a
  // faint Wash towards the canvas: the five compound to about a quarter
  // against the element and drop a share per band on the way out, so the Wash
  // eases out with the blur instead of ending at a plate's edge. Each layer's
  // own mask ramps its share in, and the background-color transition melts it
  // out with `isShown`.
  wash: {
    backgroundColor: `color-mix(in srgb, ${color.bgCanvasFade} 6%, transparent)`,
  },
});

const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
  // Stated once, on the wrapper the layers read it from: a custom property is
  // not a size, so the wrapper's own box stays a point.
  boxSize: (width: number, height: number) => ({
    "--blur-box-inline-size": `${String(width)}px`,
    "--blur-box-block-size": `${String(height)}px`,
  }),
});
