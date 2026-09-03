"use client";

import * as stylex from "@stylexjs/stylex";
import {
  use,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import type { StyleProp } from "../style-prop.ts";
import { color } from "../tokens.stylex.ts";
import { observeChildren } from "../utils/observe-children.ts";
import { observeViewport } from "../utils/observe-viewport.ts";
import { BlurPlaneContext } from "./blur-plane.tsx";
import { buildBlurLayers, type BlurGeometry } from "./build-blur-layers.ts";
import {
  isSameGeometry,
  isSameSize,
  measureGeometry,
  reachGeometry,
  unionRect,
  type BoxSize,
} from "./measure-geometry.ts";
import { placeFixedBox, type BoxOffset } from "./place-fixed-box.ts";

interface ProgressiveBlurProps {
  /**
   * The floating element the blur radiates from; several children are measured
   * as one, less any with no box at this breakpoint. The slot forces
   * `pointer-events: auto` on it, so a consumer keeping a hidden floating
   * element mounted switches pointer events off again inside it.
   */
  children?: ReactNode;
  /**
   * Nominal blur radius in px at the strongest point, against the floating
   * element. Clamped to the cap (32).
   * @default 16
   */
  radius?: number;
  /**
   * Whether the blur is shown. Toggling melts the radius and the Wash away and
   * back, so keep the element mounted while the exit plays.
   * @default true
   */
  isShown?: boolean;
  /**
   * How far the blur reaches past the floating element, in px, on every side —
   * the box is then the element plus this margin, in flow around it.
   * Its layers sit in a `position: fixed` box, so an ancestor that makes a
   * containing block for `fixed` (a transform, a filter, `contain`) moves and
   * clips them.
   */
  reach?: number;
  /**
   * Whether the blur belongs on the page's Blur plane. Only `reach` reads
   * this; `false` is a popup's choice, since it covers its surrounding chrome
   * and must blur above it, not on the shared plane.
   * @default true
   */
  isOnPlane?: boolean;
  /**
   * StyleX styles merged over the component's own — the escape hatch for
   * placement and stacking (position, inset, z-index).
   */
  css?: StyleProp;
}

/**
 * The page blurred around whatever floats, in place of dimming it, sized to
 * its positioned ancestor or, with `reach`, to itself plus that margin. The
 * box must never clip — that strips the layers' masks (see `MaskBand`) — and
 * must stay outside any named `ViewTransition` group, which would otherwise
 * capture it apart from the page it filters.
 */
export function ProgressiveBlur({
  children,
  radius = 16,
  isShown = true,
  reach,
  isOnPlane = true,
  css,
}: ProgressiveBlurProps) {
  const plane = use(BlurPlaneContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement | null>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const offsetRef = useRef<BoxOffset | null>(null);
  const [geometry, setGeometry] = useState<BlurGeometry | null>(null);
  const [boxSize, setBoxSize] = useState<BoxSize | null>(null);
  const [isElementMissing, setIsElementMissing] = useState(false);
  const hasReach = reach !== undefined;
  // A slot never measured with an element in it keeps the uniform first-paint
  // blur; one that lost the element it had melts out.
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
      // An empty measurement keeps the last rect, so the ramp melts away where
      // the element was instead of snapping every mask to uniform.
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

  // The box's place is written straight to the node rather than kept in state,
  // because a scroll gesture would otherwise re-render the floating element
  // every frame. Its size does reach state, because the masks are drawn at the
  // box's size — but only when it changes, which scrolling never does.
  const place = useCallback(() => {
    const layers = layersRef.current;
    const slot = slotRef.current;
    if (reach === undefined || !layers || !slot) return;

    const rect = unionRect(slot.children);
    setIsElementMissing(rect === null);
    // An empty measurement keeps the last box, so the blur melts away where the
    // element was.
    if (rect === null) return;

    offsetRef.current = placeFixedBox(layers, rect, reach, offsetRef.current);
    // Rounded so a subpixel jitter doesn't rewrite five SVG masks.
    const size = {
      width: Math.round(rect.right - rect.left + 2 * reach),
      height: Math.round(rect.bottom - rect.top + 2 * reach),
    };
    setBoxSize((current) => (isSameSize(current, size) ? current : size));
  }, [reach]);

  // The wrapper's own ref, because a fresh one — mounted onto the plane, or
  // beside the element — carries none of the offsets written to the last. On
  // the first mount the slot is not attached yet and `place` bails, leaving the
  // effect below to place the box.
  const setLayers = useCallback(
    (node: HTMLDivElement | null) => {
      layersRef.current = node;
      offsetRef.current = null;
      if (node !== null) place();
    },
    [place],
  );

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

    return observeViewport(place);
  }, [reach, isShown, place]);

  const layers = buildBlurLayers({
    geometry: hasReach ? reachGeometry(reach, boxSize) : geometry,
    radius,
    isShown: isBlurShown,
  });
  // The fixed box of `reach` mode is square, so only the box-filling mode
  // inherits corners.
  const boxCorners = !hasReach && styles.corners;

  const layersWrapper = (
    <div
      ref={setLayers}
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
  );

  // A plane the page keeps but hasn't mounted yet renders no layers: nothing
  // is visible before the box is placed and the plane lands together.
  const isLayersBeside = !(hasReach && isOnPlane && plane !== null);
  const placedLayers = isLayersBeside
    ? layersWrapper
    : plane.node === null
      ? null
      : createPortal(layersWrapper, plane.node);

  return (
    <div
      ref={rootRef}
      css={[
        styles.root,
        hasReach && styles.reachRoot,
        hasReach && isLayersBeside && styles.reachRootBeside,
        boxCorners,
        css,
      ]}
    >
      {placedLayers}
      <span ref={slotRef} css={styles.slot}>
        {children}
      </span>
    </div>
  );
}

const styles = stylex.create({
  root: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  // Static, so a popup anchored inside the floating element resolves against
  // the chrome around the blur rather than against the blur's own box.
  reachRoot: {
    position: "static",
    inset: "auto",
  },
  // A stacking context, so the fixed wrapper below can drop under the root's
  // own content instead of blurring the very element the blur belongs to. It is
  // not a backdrop root, so the layers still read the page through it.
  reachRootBeside: {
    position: "relative",
    zIndex: 0,
  },
  layers: {
    position: "absolute",
    inset: 0,
  },
  // Corners are inherited down to each layer, so nothing above this needs its
  // own clip.
  corners: {
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // Fixed, not absolute: absolute would grow scrollable ancestors by the
  // `reach` overhang and sit under a squircle clip that strips the masks.
  // Kept at 0×0 with size passed via custom properties, so Safari on iOS
  // walks past it instead of flattening the status bar — see "Progressive
  // blur" in `CONTEXT.md`.
  reachLayers: {
    position: "fixed",
    inset: "auto",
    inlineSize: 0,
    blockSize: 0,
    zIndex: -1,
  },
  reachLayer: {
    inlineSize: "var(--blur-box-inline-size, 0px)",
    blockSize: "var(--blur-box-block-size, 0px)",
    insetInlineEnd: "auto",
    insetBlockEnd: "auto",
  },
  // The first paint comes before the first measurement. The layers inherit
  // this; the root never takes it, which would hold the element unrendered.
  unplaced: {
    visibility: "hidden",
  },
  hidden: {
    visibility: "hidden",
  },
  // Show/hide animates the radius, not opacity: opacity below 1 makes an
  // ancestor a backdrop root, cutting the page off from the filters beneath
  // it. `visibility` sits on each layer, not the root, since a hidden root
  // would leave the floating element unrendered when a view transition
  // captures its new state.
  layer: {
    position: "absolute",
    inset: 0,
    maskSize: "100% 100%",
    maskRepeat: "no-repeat",
    transition: {
      default: `backdrop-filter ${duration._300} ${easing.ease}, background-color ${duration._300} ${easing.ease}, visibility ${duration._300}`,
      [motionConstants.REDUCED_MOTION]: `backdrop-filter ${duration._150} ${easing.ease}, background-color ${duration._150} ${easing.ease}, visibility ${duration._150}`,
    },
  },
  // display:contents keeps the element in the consumer's layout; pointer-events
  // inherits from here, so the root stays click-through while this element
  // doesn't.
  slot: {
    display: "contents",
    pointerEvents: "auto",
  },
  // Blur alone leaves brightness untouched, so something glaring behind would
  // still glare through; the Wash dims it. Each layer's mask ramps its share
  // of the Wash to match the blur's own falloff.
  wash: {
    backgroundColor: `color-mix(in srgb, ${color.bgCanvasFade} 6%, transparent)`,
  },
});

const dynamicStyles = stylex.create({
  layer: (filter: string, mask: string) => ({
    backdropFilter: filter,
    maskImage: mask,
  }),
  boxSize: (width: number, height: number) => ({
    "--blur-box-inline-size": `${String(width)}px`,
    "--blur-box-block-size": `${String(height)}px`,
  }),
});
