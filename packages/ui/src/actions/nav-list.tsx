"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import { EffectContainer } from "../effect-layer/effect-container.tsx";
import { useDust } from "../effect-layer/use-dust.ts";
import { useEffectContainer } from "../effect-layer/use-effect-container.ts";
import { useExtractorFan } from "../effect-layer/use-extractor-fan.ts";
import { useIsEffectMeasured } from "../effect-layer/use-is-effect-measured.ts";
import { mergeRefs } from "../merge-refs.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { color, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { createNavListMotion } from "./create-nav-list-motion.ts";
import {
  NavListContext,
  PlainAnchor,
  type NavListLinkProps,
} from "./nav-list-context.tsx";
import { navListTokens } from "./nav-list.stylex.ts";

/** The dust particles the old marker sheds every 100 px of its edge. */
const SHED_BURST = 6;
/** How fast the new marker pulls dust in, as `useExtractorFan` takes it. */
const PULL_STRENGTH = 3;

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
 * A marker, in the look of the hover fill, and a bold label show the current
 * page. When the current page changes, the marker springs from the old row
 * to the new row. Inside an `EffectLayerProvider` with WebGPU, the old
 * marker instead shrinks and fades as it sheds its dust, and the dust goes
 * into the new row. There the hover fill of the clicked row becomes the
 * marker, or, with no hover fill, the marker forms from the dust as it
 * lands. When the old row is not on the screen, the marker grows in at the
 * new row, or the hover fill there becomes the marker. When the new row is
 * not on the screen, the marker springs there with no dust. While a group
 * in a group is closed, the marker is on the row of the group that holds
 * the current page. When a group opens or closes, the marker springs with
 * the rows, with no dust. Under a fine pointer, one hover fill glides from
 * row to row under the pointer and fades out when the pointer leaves the
 * list. It does not show on the marker's row, where a press shows on the
 * marker. Under reduced motion, the marker and the fill move at once, with
 * no dust.
 */
export function NavList({
  children,
  linkComponent = PlainAnchor,
  css,
}: NavListProps) {
  const engine = useMotionEngine();
  const [motion] = useState(() => createNavListMotion(engine));
  const [isReady, setIsReady] = useState(false);
  const [dust, setDust] = useState({ shakes: 0, reach: 0 });
  const container = useEffectContainer();
  const isMeasured = useIsEffectMeasured();
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const shedRef = useRef<HTMLSpanElement>(null);
  const hoverRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const [box, list, marker, shed, hover] = [
      boxRef.current,
      listRef.current,
      markerRef.current,
      shedRef.current,
      hoverRef.current,
    ];
    if (!box || !list || !marker || !shed || !hover) return;
    const detach = motion.attach({
      box,
      list,
      marker,
      shed,
      hover,
      canShed: () => isMeasured(shed),
      onPull: (reach, shake) => {
        setDust((last) =>
          !shake && reach === last.reach
            ? last
            : { shakes: last.shakes + (shake ? 1 : 0), reach },
        );
      },
    });
    setIsReady(true);
    return detach;
  }, [motion, isMeasured]);

  return (
    <NavListContext value={{ nested: false, linkComponent, motion }}>
      <div
        ref={mergeRefs(boxRef, container)}
        css={[styles.box, css]}
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
          css={[corner.radius_2, transition.colors, styles.fill, styles.look]}
        />
        <EffectContainer value={container}>
          <MarkerFills
            markerRef={markerRef}
            shedRef={shedRef}
            shakes={dust.shakes}
            reach={dust.reach}
          />
        </EffectContainer>
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

/**
 * The marker of the current page, which pulls dust in while it forms, and
 * the old marker, which sheds dust where it was. Their effect hooks are in
 * the scope of the list, so the pull takes no dust from the page around it.
 */
function MarkerFills({
  markerRef,
  shedRef,
  shakes,
  reach,
}: {
  markerRef: Ref<HTMLSpanElement>;
  shedRef: Ref<HTMLSpanElement>;
  shakes: number;
  reach: number;
}) {
  const fanRef = useExtractorFan({ reach, strength: PULL_STRENGTH });
  const dustRef = useDust({ density: 0, burst: SHED_BURST, shakes });
  const fill = [corner.radius_2, transition.colors, styles.fill, styles.look];
  return (
    <>
      <span ref={mergeRefs(shedRef, dustRef)} aria-hidden css={fill} />
      <span ref={mergeRefs(markerRef, fanRef)} aria-hidden css={fill} />
    </>
  );
}

/**
 * The look of the marker and of the hover fill. In light it is one step over
 * the hover of a control, so it shows on the white rail. In dark it is a
 * tint of that hover, so it stays quiet.
 */
const LOOK = `light-dark(${color.bgSurfaceFade}, color-mix(in srgb, ${color.bgControlHover} 55%, transparent))`;

const styles = stylex.create({
  // `isolate` keeps the fills under the rows and over the surface behind
  // the list.
  box: {
    position: "relative",
    isolation: "isolate",
  },
  list: {
    [navListTokens.step]: rhythm.item,
    [color.bgControlSelected]: LOOK,
  },
  fill: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    zIndex: -1,
    pointerEvents: "none",
    filter: "opacity(0)",
  },
  look: {
    backgroundColor: {
      default: LOOK,
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
