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
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { EffectContainer } from "../effect-layer/effect-container.tsx";
import { useDust } from "../effect-layer/use-dust.ts";
import { useEffectContainer } from "../effect-layer/use-effect-container.ts";
import { useExtractorFan } from "../effect-layer/use-extractor-fan.ts";
import { useIsEffectMeasured } from "../effect-layer/use-is-effect-measured.ts";
import { mergeRefs } from "../merge-refs.ts";
import { useFlowBlock } from "../motion/use-flow-block.tsx";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { border, controlSize, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { createNavListMotion, NAV_MARKER } from "./create-nav-list-motion.ts";
import {
  NavListContext,
  PlainAnchor,
  type NavListLinkProps,
} from "./nav-list-context.tsx";
import { navListQueries, navListTokens } from "./nav-list.stylex.ts";

/** The dust particles the old icon sheds every 100 px of its edge. */
const SHED_BURST = 12;

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
 * to the new row, and the hover fill of the new row fades out as the marker
 * comes over it. Inside an `EffectLayerProvider` with WebGPU, where both rows
 * have an icon on the screen, a small burst of dust also goes from the old
 * icon to the new icon, and lands as the marker settles. In all other cases
 * there is no dust. When the old row is not on the screen, the marker grows
 * in at the new row, or the hover fill there becomes the marker. While a
 * group in a group is closed, the marker is on the row of the group that
 * holds the current page. When a group opens or closes, the marker springs
 * with the rows, with no dust. Under a fine pointer, one hover fill glides
 * from row to row under the pointer and fades out when the pointer leaves the
 * list. It does not show on the marker's row, where a press shows on the
 * marker. Under reduced motion, the marker and the fill move at once, with no
 * dust. Where the list is a page of a `NavigationSplitView`, it has no current
 * row, and it shows as a `List`: one surface of rows, each with a caret.
 */
export function NavList({
  children,
  linkComponent = PlainAnchor,
  css,
}: NavListProps) {
  const engine = useMotionEngine();
  const [motion] = useState(() => createNavListMotion(engine));
  const [isReady, setIsReady] = useState(false);
  const [dust, setDust] = useState({ shakes: 0, reach: 0, strength: 0 });
  const container = useEffectContainer();
  const isMeasured = useIsEffectMeasured();
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const hoverRef = useRef<HTMLSpanElement>(null);
  const shedRef = useRef<HTMLSpanElement>(null);
  const fanRef = useRef<HTMLSpanElement>(null);
  const { ref: flowRef, skin } = useFlowBlock({ surface: true });

  useLayoutEffect(() => {
    const [box, list, marker, hover, shed, fan] = [
      boxRef.current,
      listRef.current,
      markerRef.current,
      hoverRef.current,
      shedRef.current,
      fanRef.current,
    ];
    if (!box || !list || !marker || !hover || !shed || !fan) return;
    const detach = motion.attach({
      box,
      list,
      marker,
      hover,
      shed,
      fan,
      canShed: () => isMeasured(shed),
      onPull: (reach, strength, shake) => {
        setDust((last) =>
          !shake && reach === last.reach
            ? last
            : { shakes: last.shakes + (shake ? 1 : 0), reach, strength },
        );
      },
    });
    setIsReady(true);
    return detach;
  }, [motion, isMeasured]);

  return (
    <NavListContext value={{ nested: false, linkComponent, motion }}>
      <div
        ref={mergeRefs(boxRef, container, flowRef)}
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
        <span ref={hoverRef} aria-hidden css={FILL} />
        <span
          ref={markerRef}
          aria-hidden
          {...{ [NAV_MARKER]: "" }}
          css={FILL}
        />
        <EffectContainer value={container}>
          <IconDust
            shedRef={shedRef}
            fanRef={fanRef}
            shakes={dust.shakes}
            reach={dust.reach}
            strength={dust.strength}
          />
        </EffectContainer>
        <ul
          ref={listRef}
          css={[stack.rows, styles.list, isReady && styles.drawnByFills]}
        >
          {children}
        </ul>
        {skin}
      </div>
    </NavListContext>
  );
}

/**
 * The hidden elements that go on the old icon, which sheds the dust, and on
 * the new icon, which pulls it in. Their effect hooks are in the scope of the
 * list, so the pull takes no dust from the page around it. A hook on each row
 * would also shed dust on each click.
 */
function IconDust({
  shedRef,
  fanRef,
  shakes,
  reach,
  strength,
}: {
  shedRef: Ref<HTMLSpanElement>;
  fanRef: Ref<HTMLSpanElement>;
  shakes: number;
  reach: number;
  strength: number;
}) {
  const dustRef = useDust({ density: 0, burst: SHED_BURST, shakes });
  const pullRef = useExtractorFan({ reach, strength });
  return (
    <>
      <span
        ref={mergeRefs(shedRef, dustRef)}
        aria-hidden
        css={[styles.fill, styles.spot, styles.iconColor]}
      />
      <span
        ref={mergeRefs(fanRef, pullRef)}
        aria-hidden
        css={[styles.fill, styles.spot]}
      />
    </>
  );
}

/**
 * The look of the marker, of the hover fill, and of the current row until the
 * marker draws it. In light it is the hover of a control, so it shows on the
 * white rail. In dark it is a tint of that hover, so it stays quiet.
 */
const LOOK = `light-dark(${color.bgControlHover}, color-mix(in srgb, ${color.bgControlHover} 55%, transparent))`;

const styles = stylex.create({
  // `isolate` keeps the fills under the rows and over the surface behind
  // the list.
  box: {
    position: "relative",
    isolation: "isolate",
    borderWidth: { default: 0, [navListQueries.sidebarPage]: border.size_1 },
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: { default: 0, [navListQueries.sidebarPage]: border.radius_3 },
    cornerShape: "squircle",
    backgroundColor: {
      default: "transparent",
      [navListQueries.sidebarPage]: color.bgSurface,
    },
    overflow: { default: "visible", [navListQueries.sidebarPage]: "clip" },
  },
  list: {
    [navListTokens.rowInset]: {
      default: null,
      [navListQueries.sidebarPage]: space._3,
    },
    [navListTokens.step]: {
      default: null,
      [navListQueries.sidebarPage]: "0px",
    },
    [color.bgControlSelected]: {
      default: LOOK,
      [navListQueries.sidebarPage]: "transparent",
    },
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
  // The effect layer measures only an element with a box, and not one at
  // `opacity: 0`. So these have a box before the first change of page puts
  // them on an icon, and `fill` hides them through a filter.
  spot: {
    inlineSize: controlSize._4,
    blockSize: controlSize._4,
  },
  // The dust takes this fill.
  iconColor: {
    backgroundColor: color.fgMuted,
  },
  // Until the fills are on their rows, each row paints its own hover and
  // current fill, such as in the first paint of a page from the server.
  drawnByFills: {
    [color.bgControlHover]: "transparent",
    [color.bgControlSelected]: "transparent",
    // Under a mouse the hover fill shows the press. A touch has no hover fill,
    // so its row paints the press.
    [color.bgControlPressed]: {
      default: null,
      [pointer.canHover]: "transparent",
    },
  },
});

const FILL = [corner.radius_2, transition.colors, styles.fill, styles.look];
