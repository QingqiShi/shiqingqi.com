"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { handBack } from "../effect-layer/hand-back.stylex.ts";
import {
  LIQUID_BOX,
  LIQUID_INDICATOR,
  LIQUID_SEGMENT,
  LIQUID_VERTICAL,
} from "../effect-layer/liquid-indicator.ts";
import { useLiquid } from "../effect-layer/use-liquid.ts";
import { selectedSurface } from "../forms/segment-track.stylex.ts";
import { mergeRefs } from "../merge-refs.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { useReducedMotion } from "../motion/use-reduced-motion.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  easing,
  motionConstants,
  transition,
} from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { color, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { createNavListMotion } from "./create-nav-list-motion.ts";
import {
  NavListContext,
  PlainAnchor,
  type NavListLinkProps,
} from "./nav-list-context.tsx";
import { navListMarker, navListTokens } from "./nav-list.stylex.ts";

const TRACK = { [LIQUID_VERTICAL]: "", [LIQUID_BOX]: "" };
const INDICATOR = { [LIQUID_INDICATOR]: "" };

/** The rows of `box` that the liquid can rest in, in order. */
function rowsOf(box: HTMLElement) {
  return Array.from(box.querySelectorAll(`[${LIQUID_SEGMENT}]`));
}

export type { NavListLinkProps } from "./nav-list-context.tsx";

interface NavListProps {
  /**
   * The rows: each a `NavLink`, or a `NavGroup` of them, which is a section.
   *
   * @zh 各行：每行是一个 `NavLink`，或由它们组成的 `NavGroup`（即一个分区）。
   */
  children: ReactNode;
  /**
   * The component that renders every link in the list, groups included, such
   * as a router's link. Defaults to a plain `<a>`. Forward `className` and
   * `style` onto the anchor, or a link loses its look.
   *
   * @zh 渲染列表中每个链接（含分组内的链接）的组件，例如路由的链接组件。默认为普通 `<a>`。请把 `className` 与 `style` 转发到锚点上，否则链接会失去样式。
   */
  linkComponent?: ComponentType<NavListLinkProps>;
  /**
   * StyleX styles merged over the list's own.
   *
   * @zh 合并到列表自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * The links that move between the pages of one place, such as a rail of
 * destinations or the sections of a settings screen, in one column. It sits
 * inside the caller's `<nav>`, which names the landmark. The links are the
 * strongest text in it. Labels and icons are muted. The structure sets every
 * space in it, so a caller writes none (see `NavGroup`).
 *
 * One raised marker shows the current page. When the current page changes,
 * the marker springs from the old row to the new row, and inside an
 * `EffectLayerProvider` with WebGPU the effect layer draws it as liquid on
 * its way, as the indicator of a `SegmentedControl` moves: it melts as it
 * leaves the old row, flows to the new row and sets into the marker there.
 * When the old row is not on the screen, the marker grows in at the new row.
 * While a group in a group is closed, the marker is on the row of the group
 * that holds the current page. When a group opens or closes, the marker
 * springs with the rows, with no liquid. Under a fine pointer, one hover
 * fill glides from row to row under the pointer and fades out when the
 * pointer leaves the list. Under reduced motion, the marker and the fill
 * move at once, with no liquid.
 */
export function NavList({
  children,
  linkComponent = PlainAnchor,
  css,
}: NavListProps) {
  const engine = useMotionEngine();
  const [motion] = useState(() => createNavListMotion(engine));
  const [isReady, setIsReady] = useState(false);
  const [liquid, setLiquid] = useState({ position: 0, pour: false });
  const isReduced = useReducedMotion();
  const liquidRef = useLiquid({
    position: liquid.position,
    pour: liquid.pour && !isReduced,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const hoverRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const [box, list, marker, hover] = [
      boxRef.current,
      listRef.current,
      markerRef.current,
      hoverRef.current,
    ];
    if (!box || !list || !marker || !hover) return;
    const detach = motion.attach({
      box,
      list,
      marker,
      hover,
      onMarkerMove: (row, isNavigation) => {
        setLiquid({
          position: Math.max(0, rowsOf(box).indexOf(row)),
          pour: isNavigation,
        });
      },
    });
    setIsReady(true);
    return detach;
  }, [motion]);

  return (
    <NavListContext value={{ nested: false, linkComponent, motion }}>
      <div
        ref={mergeRefs(boxRef, liquidRef)}
        {...TRACK}
        css={[navListMarker, styles.box, css]}
        onPointerOver={(event) => {
          motion.hoverOver(event.target, event.pointerType);
        }}
        onPointerLeave={() => {
          motion.hoverOut();
        }}
        onPointerDown={(event) => {
          motion.press(event.target, true);
        }}
        onPointerUp={(event) => {
          motion.press(event.target, false);
        }}
        onPointerCancel={(event) => {
          motion.press(event.target, false);
        }}
      >
        <span
          ref={hoverRef}
          aria-hidden
          css={[corner.radius_2, transition.colors, styles.fill, styles.hover]}
        />
        <span
          ref={markerRef}
          aria-hidden
          {...INDICATOR}
          css={[corner.radius_2, styles.fill, styles.marker]}
        />
        <ul
          ref={listRef}
          css={[stack.rows, styles.list, isReady && styles.drawnByFills]}
        >
          {children}
        </ul>
      </div>
    </NavListContext>
  );
}

/** The effect layer sets this attribute on the box while it draws the marker. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

const styles = stylex.create({
  // `isolate` keeps the fills under the rows and over the surface behind
  // the list.
  box: {
    position: "relative",
    isolation: "isolate",
  },
  list: {
    [navListTokens.step]: rhythm.item,
  },
  fill: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    zIndex: -1,
    pointerEvents: "none",
    opacity: 0,
  },
  // While the effect layer draws the marker as liquid, the marker keeps its
  // box and its colours for the effect to read, and hides. It hides at once,
  // and fades back in as the effect hands it back. The motion writes its
  // opacity, so it hides through a filter.
  marker: {
    backgroundColor: color.bgControlRaised,
    boxShadow: selectedSurface.edge,
    filter: {
      default: null,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, navListMarker)]: "opacity(0)",
    },
    transition: {
      default: `filter ${handBack.duration} ${easing.linear}`,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, navListMarker)]: "none",
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  // In light the hover fill is one step over the hover of a control, so it
  // shows on the white rail. In dark it is the fill of the marker, so it is
  // fainter there.
  hover: {
    backgroundColor: {
      default: `light-dark(${color.bgSurfaceFade}, color-mix(in srgb, ${color.bgControlHover} 55%, transparent))`,
      ":is([data-pressed])": color.bgControlPressed,
    },
  },
  // Until the fills are on their rows, each row paints its own hover and
  // current fill, such as in the first paint of a page from the server.
  drawnByFills: {
    [color.bgControlHover]: "transparent",
    [color.bgControlSelected]: "transparent",
  },
});
