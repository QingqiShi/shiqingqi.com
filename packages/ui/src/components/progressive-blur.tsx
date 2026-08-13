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
  LAYER_COUNT,
  type BlurGeometry,
} from "./progressive-blur-masks.ts";

interface ProgressiveBlurProps {
  /**
   * The floating element the blur radiates from. It is measured, so the ramp
   * needs no direction; it renders above the layers and stays interactive
   * while they, and the box around them, let clicks through.
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
   * StyleX styles merged over the component's own — the escape hatch for
   * placement and plane (position, inset, z-index).
   */
  css?: StyleProp;
}

/**
 * The page blurred around whatever floats, in place of dimming it — strongest
 * against the floating element, easing back to sharp further out on every
 * side. The consumer never states a direction: the floating element is passed
 * as `children`, the component measures where it sits inside its own box, and
 * the ramp radiates out of that rect, running out to the box's own edges
 * before the page is sharp again. By default the box fills its nearest
 * positioned ancestor; the consumer places it over the page region around the
 * element via `css`.
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
 * The measurement is taken on mount and again whenever the box or the
 * floating element resizes, or the element is swapped for another. An element
 * that moves without changing size — a transform, a keyframe animation, the
 * layout around it shifting — leaves the ramp centred where it was until one
 * of those happens.
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
  css,
}: ProgressiveBlurProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<BlurGeometry | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const slot = slotRef.current;
    if (!root || !slot) return;

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
  }, []);

  const layers = buildBlurLayers({ geometry, radius, isShown });

  return (
    <div ref={rootRef} css={[styles.root, css]}>
      {layers.map(({ filter, mask }, index) => (
        <div
          // eslint-disable-next-line @eslint-react/no-array-index-key -- layers are positional; index IS the identity
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
      <span ref={slotRef} css={styles.slot}>
        {children}
      </span>
    </div>
  );
}

/**
 * The root's box and the union of the floating children's boxes within it.
 * `null` when either is missing or empty, which leaves the layers unmasked.
 */
function measureGeometry(root: HTMLElement, slot: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width <= 0 || rootRect.height <= 0) return null;

  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const child of slot.children) {
    const rect = child.getBoundingClientRect();
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  if (right <= left || bottom <= top) return null;

  // Rounded so a subpixel jitter doesn't rewrite every mask string.
  return {
    width: Math.round(rootRect.width),
    height: Math.round(rootRect.height),
    left: Math.round(left - rootRect.left),
    top: Math.round(top - rootRect.top),
    right: Math.round(right - rootRect.left),
    bottom: Math.round(bottom - rootRect.top),
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
  layer: {
    position: "absolute",
    inset: 0,
    visibility: "visible",
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
    WebkitMaskImage: mask,
  }),
});
