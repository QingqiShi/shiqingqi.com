"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode, RefObject } from "react";
import { breakpoints } from "../../breakpoints.stylex.ts";
import { scrollbar } from "../../primitives/layout.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "../../primitives/motion.stylex.ts";
import { border, color, layer, shadow, space } from "../../tokens.stylex.ts";
import { IconButton } from "../actions/icon-button.tsx";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  drawerRef: RefObject<HTMLDivElement | null>;
  menuLabel: string;
  closeLabel: string;
  sidebarHeader?: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
}

/**
 * `SidebarLayout`'s Drawer: its navigation rail below `md`, and the sticky
 * rail itself at `md` and up — one element serves both (see CONTEXT.md).
 *
 * @internal
 */
export function Drawer({
  isOpen,
  onClose,
  drawerRef,
  menuLabel,
  closeLabel,
  sidebarHeader,
  sidebarFooter,
  children,
}: DrawerProps) {
  return (
    <>
      {/* Backdrop and drawer stay mounted, so the slide/fade transitions in
          both directions; visibility drops the closed state from focus and
          a11y. */}
      <div
        css={[styles.backdrop, isOpen && styles.backdropOpen]}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        css={[styles.rail, isOpen && styles.railOpen]}
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
        <ScrollMask
          orientation="vertical"
          css={styles.railNav}
          contentCss={[
            styles.railNavContent,
            sidebarFooter == null && styles.railNavContentNoFooter,
            scrollbar.autoHide,
            transition.scrollbarColor,
          ]}
          startChrome={
            <div css={styles.railHeader}>
              <div css={styles.railTitle}>{sidebarHeader}</div>
              <IconButton
                css={styles.railClose}
                icon={<XIcon weight="bold" />}
                aria-label={closeLabel}
                onClick={onClose}
              />
            </div>
          }
          endChrome={
            sidebarFooter != null ? (
              <div css={styles.railFooter}>{sidebarFooter}</div>
            ) : undefined
          }
        >
          {children}
        </ScrollMask>
      </div>
    </>
  );
}

const styles = stylex.create({
  // Visibility transitions alongside opacity/transform, so CSS keeps the
  // element visible until the transition ends, then drops it from focus and
  // the a11y tree. Values are literal strings: interpolating `duration`/
  // `easing` from another `.stylex.ts` module compiles to an undefined
  // `var()`, unsetting the whole declaration.
  backdrop: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.bgScrim,
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
    transition: {
      default: `opacity ${duration._300} ${easing.ease}, visibility ${duration._300}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._150} ${easing.ease}, visibility ${duration._150}`,
    },
  },
  backdropOpen: {
    opacity: 1,
    visibility: "visible",
    pointerEvents: "auto",
  },
  // Reduced motion drops the slide and plays only the fade. Both supported
  // locales are LTR, so the off-canvas translate needs no logical flip.
  rail: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
    // No overflow clip here, though the nav bleeds to the card's edges — the
    // nav's scroller inherits these corners, and a clip here would strip the
    // bands' masks (see `MaskBand`).
    position: { default: "fixed", [breakpoints.md]: "sticky" },
    insetBlockStart: { default: 0, [breakpoints.md]: space._2 },
    insetBlockEnd: { default: 0, [breakpoints.md]: "auto" },
    insetInlineEnd: { default: 0, [breakpoints.md]: "auto" },
    alignSelf: { default: "auto", [breakpoints.md]: "stretch" },
    // Cap = viewport minus the top+bottom margins (keep the factor and
    // marginBlock in sync) so the full-height card never reaches an edge.
    maxBlockSize: {
      default: "none",
      [breakpoints.md]: `calc(100dvh - 2 * ${space._2})`,
    },
    marginBlock: { default: 0, [breakpoints.md]: space._2 },
    marginInlineStart: { default: 0, [breakpoints.md]: space._2 },
    inlineSize: {
      default: `min(${space._14}, 85vw)`,
      [breakpoints.md]: "auto",
    },
    // Mobile: the drawer is an overlay, so it takes that plane and covers the
    // pill bar (`layer.header`). md+: the rail is page chrome that only has to
    // clear scrolling content, which leaves an open overlay above it.
    zIndex: { default: layer.overlay, [breakpoints.md]: layer.content },
    // No padding: the nav spans the card's whole box, so the corners it
    // inherits line up with these. The chrome slots carry the block insets
    // the rail used to, and the scroller the inline ones.
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: color.bgCanvasSubtle,
    },
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
    transform: {
      default: "translateX(110%)",
      [motionConstants.REDUCED_MOTION]: "none",
      [breakpoints.md]: "none",
    },
    opacity: { default: 0, [breakpoints.md]: 1 },
    visibility: { default: "hidden", [breakpoints.md]: "visible" },
    transition: {
      default: `transform ${duration._300} ${easing.entrance}, opacity ${duration._300} ${easing.entrance}, visibility ${duration._300}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._150} ${easing.ease}, visibility ${duration._150}`,
      [breakpoints.md]: "none",
    },
  },
  railOpen: {
    transform: "none",
    opacity: 1,
    visibility: "visible",
  },
  // These slots reproduce the rail's old block padding and gap, so the chrome
  // and nav still sit where the flex column used to place them.
  railHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    minInlineSize: 0,
    paddingBlockStart: {
      default: `calc(${space._3} + env(safe-area-inset-top))`,
      [breakpoints.md]: space._2,
    },
    paddingBlockEnd: space._2,
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
      default: space._3,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-left))`,
    },
    paddingInlineEnd: {
      default: `calc(${space._3} + env(safe-area-inset-right))`,
      [breakpoints.md]: space._2,
    },
  },
  railFooter: {
    paddingBlockStart: space._2,
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-bottom))`,
    },
  },
  // Without a footer slot, no chrome carries the block-end inset, so the
  // scroller pads its own end and the band sits at the card edge.
  railNavContentNoFooter: {
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-bottom))`,
    },
  },
});
