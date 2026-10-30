"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "../actions/button.tsx";
import { navListTokens } from "../actions/nav-list.stylex.ts";
import { breakpoints } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { MD_QUERY } from "../md-query.ts";
import { mergeRefs } from "../merge-refs.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { scrollbar } from "../primitives/layout.stylex.ts";
import { duration, easing, transition } from "../primitives/motion.stylex.ts";
import { scrollMaskTokens } from "../surfaces/scroll-mask.stylex.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import {
  border,
  color,
  layer,
  rhythm,
  shadow,
  space,
} from "../tokens.stylex.ts";
import {
  railTokens,
  sidebarLayoutStyles,
  sidebarLayoutTokens,
} from "./sidebar-layout.stylex.ts";

type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  drawerRef: RefObject<HTMLDivElement | null>;
  /** The inline size of the shell's rail column at `md` and up. */
  railColumnSize: string;
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
} & (
  | { hasDrawer: true; menuLabel: string; closeLabel: string }
  /** Hides the rail below `md`, where no drawer opens it. */
  | { hasDrawer: false; menuLabel?: undefined; closeLabel?: undefined }
);

/**
 * `SidebarLayout`'s Drawer: its navigation rail below `md`, and the sticky
 * rail itself at `md` and up — one element serves both.
 *
 * @internal
 */
export function Drawer({
  hasDrawer,
  isOpen,
  onClose,
  drawerRef,
  railColumnSize,
  menuLabel,
  closeLabel,
  sidebarHeader,
  sidebarFooter,
  children,
}: DrawerProps) {
  const coverRef = useEffectCover({ modal: isOpen });
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  const railRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const railRefs = mergeRefs(drawerRef, railRef, coverRef, ref);
  useDrawerMotion(railRef, backdropRef, isOpen);
  return (
    <>
      {/* Backdrop and drawer stay mounted, so they slide and fade in both
          directions; visibility drops the closed state from focus and
          a11y. */}
      {hasDrawer ? (
        <div
          ref={backdropRef}
          css={[styles.backdrop, isOpen && styles.backdropOpen]}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={railRefs}
        css={[
          styles.rail,
          isOpen && styles.railOpen,
          !hasDrawer && styles.railWithoutDrawer,
          css,
        ]}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen || undefined}
        aria-label={isOpen ? menuLabel : undefined}
        // Following a link inside the drawer should dismiss it — the shell
        // persists across client-side navigation, so nothing else would.
        onClickCapture={(event) => {
          if (
            isOpen &&
            event.target instanceof Element &&
            event.target.closest("a")
          ) {
            onClose();
          }
        }}
      >
        {/* Header and footer ride in ScrollMask's chrome slots, so the nav
            bleeds to the rail's edges and scrolled links blur progressively
            past the chrome. */}
        <EffectCarrier value={sticky}>
          <ScrollMask
            orientation="vertical"
            css={styles.railNav}
            contentCss={[
              styles.railNavContent,
              sidebarFooter == null
                ? styles.railNavContentNoFooter
                : [
                    styles.railNavContentFixedFooter,
                    dynamicStyles.railCardInlineSize(railColumnSize),
                  ],
              scrollbar.autoHide,
              transition.scrollbarColor,
            ]}
            startChrome={
              <div css={styles.railHeader}>
                <div css={styles.railTitle}>{sidebarHeader}</div>
                {hasDrawer ? (
                  <Button
                    size="sm"
                    look="ghost"
                    css={[sidebarLayoutStyles.headerControl, styles.railClose]}
                    icon={<XIcon weight="bold" />}
                    aria-label={closeLabel}
                    onClick={onClose}
                  />
                ) : null}
              </div>
            }
            endChrome={
              sidebarFooter != null ? (
                <div css={styles.railFooter}>
                  <EffectCarrier value="viewport-bottom">
                    {sidebarFooter}
                  </EffectCarrier>
                </div>
              ) : undefined
            }
            endChromeCss={styles.railFooterSlot}
          >
            {children}
          </ScrollMask>
        </EffectCarrier>
      </div>
    </>
  );
}

const RAIL_INSET = space._2;
// The box edge of the nav is this far in from the edge of the card.
const BOX_INSET = railTokens.boxInset;
const REDUCED_FADE = cssTween(duration._150, easing.ease);
const fade = (at: number) => ({ opacity: unit(at).toFixed(3) });
const slide = (at: number) => ({
  ...fade(at),
  transform: `translateX(${((1 - at) * 110).toFixed(2)}%)`,
});
/** Inline styles that keep the moving rail and backdrop seen and out of reach until they rest. */
const MOVING = { visibility: "visible" } as const;

/**
 * Below `md`, slides the rail in from the end edge and fades the backdrop
 * with it. A toggle during a slide turns it from where it is. Under reduced
 * motion both only fade. At rest the stylesheet holds each state.
 */
function useDrawerMotion(
  railRef: RefObject<HTMLDivElement | null>,
  backdropRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
) {
  const engine = useMotionEngine();
  const progress = useMotionValue(engine, isOpen ? 1 : 0);
  // At `md` and up the rail is part of the page, and the stylesheet holds it.
  const isNarrowRef = useRef(true);
  useBinding(railRef, progress, {
    pose: (at) => (isNarrowRef.current ? slide(at) : {}),
    reducedPose: (at) => (isNarrowRef.current ? fade(at) : {}),
    hold: MOVING,
    rest: "clear",
  });
  useBinding(backdropRef, progress, {
    pose: fade,
    hold: MOVING,
    rest: "clear",
  });
  const wasOpenRef = useRef(isOpen);
  useLayoutEffect(() => {
    if (wasOpenRef.current === isOpen) return;
    wasOpenRef.current = isOpen;
    isNarrowRef.current = !window.matchMedia(MD_QUERY).matches;
    progress.to(isOpen ? 1 : 0, { reduced: REDUCED_FADE });
  }, [isOpen, progress]);
}

const styles = stylex.create({
  // A closed backdrop and rail are hidden, which drops them from focus and
  // the a11y tree. `useDrawerMotion` keeps them seen while they move.
  backdrop: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.bgScrim,
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
  },
  backdropOpen: {
    opacity: 1,
    visibility: "visible",
    pointerEvents: "auto",
  },
  // Both supported locales are LTR, so the off-canvas translate needs no
  // logical flip.
  rail: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
    // No overflow clip here, though the nav bleeds to the card's edges — the
    // nav's scroller inherits these corners, and a clip here would strip the
    // bands' masks (see `MaskBand`).
    position: { default: "fixed", [breakpoints.md]: "sticky" },
    insetBlockStart: { default: 0, [breakpoints.md]: RAIL_INSET },
    insetBlockEnd: { default: 0, [breakpoints.md]: "auto" },
    insetInlineEnd: { default: 0, [breakpoints.md]: "auto" },
    // md+: the card is the viewport's height less its margins, so it never
    // reaches an edge. This size also makes the grid row at least that tall
    // at the page root, where the content can be shorter. The percentage cap
    // keeps the card in a container that is shorter than the viewport.
    blockSize: {
      default: "auto",
      [breakpoints.md]: `calc(100dvh - 2 * ${RAIL_INSET})`,
    },
    maxBlockSize: {
      default: "none",
      [breakpoints.md]: `calc(100% - 2 * ${RAIL_INSET})`,
    },
    marginBlock: { default: 0, [breakpoints.md]: RAIL_INSET },
    marginInlineStart: { default: 0, [breakpoints.md]: RAIL_INSET },
    inlineSize: {
      default: `min(${space._14}, 85vw)`,
      [breakpoints.md]: "auto",
    },
    // Mobile: the drawer is an overlay, so it takes that plane and covers the
    // menu button (`layer.header`). md+: the stuck rail is sticky page chrome, so
    // it takes the header plane over content and the effect layer, which
    // leaves an open overlay above it.
    zIndex: { default: layer.overlay, [breakpoints.md]: layer.header },
    // No padding: the nav spans the card's whole box, so the corners it
    // inherits line up with these. The chrome slots carry the block insets
    // the rail used to, and the scroller the inline ones.
    backgroundColor: color.bgSurface,
    borderStartStartRadius: {
      default: border.radius_3,
      [breakpoints.md]: border.radius_3,
    },
    borderEndStartRadius: {
      default: border.radius_3,
      [breakpoints.md]: border.radius_3,
    },
    borderStartEndRadius: { default: 0, [breakpoints.md]: border.radius_3 },
    borderEndEndRadius: { default: 0, [breakpoints.md]: border.radius_3 },
    cornerShape: "squircle",
    boxShadow: { default: shadow._6, [breakpoints.md]: shadow._2 },
    transform: { default: "translateX(110%)", [breakpoints.md]: "none" },
    opacity: { default: 0, [breakpoints.md]: 1 },
    visibility: { default: "hidden", [breakpoints.md]: "visible" },
  },
  railOpen: {
    transform: "none",
    opacity: 1,
    visibility: "visible",
  },
  railWithoutDrawer: {
    display: { default: "none", [breakpoints.md]: "flex" },
  },
  // The rail inset is above the header, and `rhythm.item` is between the
  // header and the nav. The header starts on the text edge, and the close
  // button ends on the box edge.
  railHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    minInlineSize: 0,
    paddingBlockStart: {
      default: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaTop})`,
      [breakpoints.md]: BOX_INSET,
    },
    paddingBlockEnd: rhythm.item,
    paddingInlineStart: navListTokens.rowInset,
  },
  railTitle: {
    minInlineSize: 0,
  },
  railClose: {
    display: { default: "inline-flex", [breakpoints.md]: "none" },
  },
  railNav: {
    // Spans the rail's box; `ScrollMask` owns the overflow, min-size, Scroll
    // mask at each edge, and pinning the footer while the nav is short.
    flexGrow: 1,
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  railNavContent: {
    overscrollBehavior: "contain",
    // Reserves the scrollbar gutter up front (a no-op for overlay
    // scrollbars), so link width stays constant whether or not a classic
    // scrollbar shows.
    scrollbarGutter: "stable",
    // Padding stays inside the scrollport, so the scrollbar sits flush
    // against the rail's edge while the content moves in.
    paddingInlineStart: {
      default: BOX_INSET,
      [breakpoints.md]: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaLeft})`,
    },
    paddingInlineEnd: {
      default: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaRight})`,
      [breakpoints.md]: BOX_INSET,
    },
  },
  // The footer controls show a box at rest, so they stay on the box edge.
  // `rhythm.item` is between the nav and the footer, and the rail inset is
  // below it.
  railFooter: {
    paddingBlockStart: rhythm.item,
    paddingBlockEnd: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaBottom})`,
  },
  // md+: the footer is fixed to the bottom edge of the viewport, at the
  // card's bottom edge. It is not sticky in the card. On iPad, the Safari
  // toolbar at the top collapses and expands while the page scrolls. Safari
  // changes `dvh` only after that animation ends, so the bottom edge of the
  // card jumps at the end. The bottom edge of the viewport does not move on
  // iPad. The `default` values repeat the sticky slot of `ScrollMask`,
  // because these values replace its values.
  railFooterSlot: {
    position: { default: "sticky", [breakpoints.md]: "fixed" },
    insetBlockEnd: { default: 0, [breakpoints.md]: RAIL_INSET },
    insetInlineStart: { default: null, [breakpoints.md]: RAIL_INSET },
    inlineSize: {
      default: null,
      [breakpoints.md]: railTokens.cardInlineSize,
    },
    paddingInlineStart: {
      default: null,
      [breakpoints.md]: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaLeft})`,
    },
    paddingInlineEnd: { default: null, [breakpoints.md]: BOX_INSET },
  },
  // md+: the fixed footer holds no room in the scroller, so the scroller
  // pads its end by the footer's size, and the last link scrolls clear of it.
  // The `::after` is the surface of the card behind the footer. It is below
  // the nav, so the nav blurs behind the footer as before. While the height
  // of the card changes, it shows the bottom of the card below the footer.
  railNavContentFixedFooter: {
    paddingBlockEnd: {
      default: null,
      [breakpoints.md]: scrollMaskTokens.endChrome,
    },
    "::after": {
      content: { default: null, [breakpoints.md]: '""' },
      position: "fixed",
      insetBlockEnd: RAIL_INSET,
      insetInlineStart: RAIL_INSET,
      inlineSize: railTokens.cardInlineSize,
      blockSize: scrollMaskTokens.endChrome,
      zIndex: -1,
      pointerEvents: "none",
      backgroundColor: color.bgSurface,
      borderEndStartRadius: border.radius_3,
      borderEndEndRadius: border.radius_3,
      cornerShape: "squircle",
    },
  },
  // Without a footer slot, no chrome carries the block-end inset, so the
  // scroller pads its own end and the band sits at the card edge.
  railNavContentNoFooter: {
    paddingBlockEnd: `calc(${BOX_INSET} + ${sidebarLayoutTokens.safeAreaBottom})`,
  },
});

const dynamicStyles = stylex.create({
  railCardInlineSize: (railColumnSize: string) => ({
    [railTokens.cardInlineSize]: `calc(${railColumnSize} - ${RAIL_INSET})`,
  }),
});
