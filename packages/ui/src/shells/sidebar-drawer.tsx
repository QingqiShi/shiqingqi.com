"use client";

import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { buttonTokens } from "../actions/button.stylex.ts";
import { Button } from "../actions/button.tsx";
import { navListTokens } from "../actions/nav-list.stylex.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectCover } from "../effect-layer/use-effect-cover.ts";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { mergeRefs } from "../merge-refs.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { scrollbar } from "../primitives/layout.stylex.ts";
import { duration, easing, transition } from "../primitives/motion.stylex.ts";
import { islandTokens } from "../surfaces/island.stylex.ts";
import { ScrollMask } from "../surfaces/scroll-mask.tsx";
import { border, layer, rhythm, shadow, space } from "../tokens.stylex.ts";
import { splitViewQueries } from "./navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "./navigation-split-view.stylex.ts";

interface SidebarDrawerProps {
  /** Names the sidebar's region while it is a column. */
  label: string;
  /** Names the menu button and the open drawer. */
  menuLabel: string;
  closeLabel: string;
  header?: ReactNode;
  footer?: ReactNode;
  /** Whether the sidebar fits beside the content, `null` until it is measured. */
  fits: boolean | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Whether the view is in a box that does not fill the screen. */
  isContained: boolean;
  scrollerRef: Ref<HTMLDivElement>;
  children: ReactNode;
}

/**
 * The sidebar of a `NavigationSplitView` with `stacked: "drawer"`: an island
 * beside the content where it fits, and where it does not, a menu button at the
 * top-end corner that opens it as a drawer. It is one element in both forms, and
 * CSS chooses, so the server paints the right one, and the sidebar keeps its
 * state and its scroll.
 *
 * @internal
 */
export function SidebarDrawer({
  label,
  menuLabel,
  closeLabel,
  header,
  footer,
  fits,
  isOpen,
  onOpenChange,
  isContained,
  scrollerRef,
  children,
}: SidebarDrawerProps) {
  if (isOpen && fits === true) onOpenChange(false);
  const close = () => {
    onOpenChange(false);
  };
  const coverRef = useEffectCover({ modal: isOpen && !isContained });
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  const drawerRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  useDrawerMotion(drawerRef, backdropRef, isOpen, fits === true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({
    isOpen,
    dialogRef: drawerRef,
    onClose: close,
    returnFocusRef: menuButtonRef,
  });

  // A plain body style, not `react-remove-scroll`: the DOM stays the same across
  // open and close, and the drawer's own nav still scrolls.
  const locksPage = isOpen && !isContained;
  useEffect(() => {
    if (!locksPage) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [locksPage]);

  return (
    <>
      <div css={styles.menu}>
        <EffectCarrier value="viewport">
          <Button
            ref={menuButtonRef}
            icon={<ListIcon weight="bold" />}
            aria-label={menuLabel}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onClick={() => {
              onOpenChange(true);
            }}
          />
        </EffectCarrier>
      </div>
      {/* The backdrop and the drawer stay mounted, so that they move in both
          directions. A closed one is hidden, which drops it from focus and from
          the accessibility tree. */}
      <div
        ref={backdropRef}
        aria-hidden
        onClick={close}
        css={[styles.backdrop, isOpen && styles.backdropOpen]}
      />
      <section
        ref={mergeRefs(drawerRef, coverRef, ref)}
        tabIndex={-1}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen || undefined}
        aria-label={isOpen ? menuLabel : label}
        data-split-view-column="sidebar"
        data-split-view-sidebar="full"
        css={[
          styles.drawer,
          isOpen && styles.drawerOpen,
          a11y.focusRingInset,
          css,
        ]}
        // The view stays mounted across a navigation, so nothing else would close
        // the drawer when a link in it is followed.
        onClickCapture={(event) => {
          if (
            isOpen &&
            event.target instanceof Element &&
            event.target.closest("a") !== null
          ) {
            close();
          }
        }}
      >
        <EffectCarrier value={sticky}>
          <ScrollMask
            ref={scrollerRef}
            orientation="vertical"
            css={styles.nav}
            contentCss={[
              styles.navContent,
              footer == null && styles.navContentNoFooter,
              scrollbar.autoHide,
              transition.scrollbarColor,
            ]}
            startChrome={
              <div css={styles.header}>
                <div css={styles.title}>{header}</div>
                <Button
                  size="sm"
                  look="ghost"
                  css={styles.close}
                  icon={<XIcon weight="bold" />}
                  aria-label={closeLabel}
                  onClick={close}
                />
              </div>
            }
            endChrome={
              footer == null ? undefined : (
                <div css={styles.footer}>{footer}</div>
              )
            }
          >
            {children}
          </ScrollMask>
        </EffectCarrier>
      </section>
    </>
  );
}

// The box edge of the nav is this far in from the edge of the sidebar.
const BOX_INSET = space._3;
const REDUCED_FADE = cssTween(duration._150, easing.ease);
const fade = (at: number) => ({ opacity: unit(at).toFixed(3) });
const slide = (at: number) => ({
  ...fade(at),
  transform: `translateX(${((1 - at) * 110).toFixed(2)}%)`,
});
/** What keeps the moving drawer and backdrop seen until they rest. */
const MOVING = { visibility: "visible" } as const;

/**
 * Slides the drawer in from the end edge and fades the backdrop with it. A toggle
 * during a slide turns it from where it is. Under reduced motion both only fade.
 * At rest, and where the sidebar is a column, the stylesheet holds each state.
 */
function useDrawerMotion(
  drawerRef: RefObject<HTMLElement | null>,
  backdropRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  fits: boolean,
) {
  const engine = useMotionEngine();
  const progress = useMotionValue(engine, isOpen ? 1 : 0);
  const fitsRef = useRef(fits);
  useLayoutEffect(() => {
    fitsRef.current = fits;
  }, [fits]);
  useBinding(drawerRef, progress, {
    pose: (at) => (fitsRef.current ? {} : slide(at)),
    reducedPose: (at) => (fitsRef.current ? {} : fade(at)),
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
    progress.to(isOpen ? 1 : 0, { reduced: REDUCED_FADE });
  }, [isOpen, progress]);
}

const BESIDE = splitViewQueries.contentBesideSidebar;

const styles = stylex.create({
  // The box is only as large as the button, so it is smaller than the screen on
  // both axes, and iOS Safari does not tint its status bar from it.
  menu: {
    display: { default: "flex", [BESIDE]: "none" },
    position: "fixed",
    insetBlockStart: `calc(${space._3} + env(safe-area-inset-top))`,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
    zIndex: layer.header,
  },
  backdrop: {
    display: { default: "block", [BESIDE]: "none" },
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
  // No clip here, though the nav bleeds to the edges of the box. The scroller of
  // the nav inherits these corners, and a clip here would strip the masks of its
  // bands (see `MaskBand`). Both locales are LTR, so the off-canvas translate
  // needs no logical flip.
  drawer: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    minInlineSize: 0,
    position: { default: "fixed", [BESIDE]: "relative" },
    insetBlockStart: { default: 0, [BESIDE]: "auto" },
    insetBlockEnd: { default: 0, [BESIDE]: "auto" },
    insetInlineEnd: { default: 0, [BESIDE]: "auto" },
    inlineSize: {
      default: `min(${space._14}, 85cqi)`,
      [BESIDE]: splitViewTokens.sidebarInlineSize,
    },
    zIndex: { default: layer.overlay, [BESIDE]: "auto" },
    backgroundColor: {
      default: color.bgSurface,
      [BESIDE]: color.bgSurfaceSunken,
    },
    borderStartStartRadius: {
      default: border.radius_3,
      [BESIDE]: islandTokens.radius,
    },
    borderEndStartRadius: {
      default: border.radius_3,
      [BESIDE]: islandTokens.radius,
    },
    borderStartEndRadius: { default: 0, [BESIDE]: islandTokens.radius },
    borderEndEndRadius: { default: 0, [BESIDE]: islandTokens.radius },
    cornerShape: { default: "squircle", [BESIDE]: "round" },
    boxShadow: { default: shadow._6, [BESIDE]: "none" },
    transform: { default: "translateX(110%)", [BESIDE]: "none" },
    opacity: { default: 0, [BESIDE]: 1 },
    visibility: { default: "hidden", [BESIDE]: "visible" },
  },
  drawerOpen: {
    transform: "none",
    opacity: 1,
    visibility: "visible",
  },
  nav: {
    flexGrow: 1,
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // The padding stays inside the scrollport, so the scrollbar sits flush against
  // the edge while the content moves in. The gutter keeps the width of a link
  // whether or not a classic scrollbar shows.
  navContent: {
    overscrollBehavior: "contain",
    scrollbarGutter: "stable",
    paddingInlineStart: BOX_INSET,
    paddingInlineEnd: {
      default: `calc(${BOX_INSET} + env(safe-area-inset-right))`,
      [BESIDE]: BOX_INSET,
    },
  },
  navContentNoFooter: {
    paddingBlockEnd: {
      default: `calc(${BOX_INSET} + env(safe-area-inset-bottom))`,
      [BESIDE]: BOX_INSET,
    },
  },
  // The header starts on the text edge of the nav, and the close button ends on
  // its box edge.
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    minInlineSize: 0,
    paddingBlockStart: {
      default: `calc(${BOX_INSET} + env(safe-area-inset-top))`,
      [BESIDE]: BOX_INSET,
    },
    paddingBlockEnd: rhythm.item,
    paddingInlineStart: navListTokens.rowInset,
  },
  title: {
    minInlineSize: 0,
  },
  // Muted at rest, also on touch, so that it does not compete with the title.
  close: {
    display: { default: "inline-flex", [BESIDE]: "none" },
    [buttonTokens.color]: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
  },
  // The controls of the footer show a box at rest, so they stay on the box edge.
  footer: {
    paddingBlockStart: rhythm.item,
    paddingBlockEnd: {
      default: `calc(${BOX_INSET} + env(safe-area-inset-bottom))`,
      [BESIDE]: BOX_INSET,
    },
  },
});
