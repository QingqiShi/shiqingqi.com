"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { motionConstants } from "../primitives/motion.stylex.ts";
import {
  border,
  color,
  layer,
  layout,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { IconButton } from "./icon-button.tsx";
import { ScrollFade } from "./scroll-fade.tsx";

// Default width of the navigation rail on wider viewports.
const DEFAULT_SIDEBAR_INLINE_SIZE = "200px";

// Must stay in sync with `breakpoints.md` (768px): the drawer only exists
// below it, the rail column at or above it.
const MD_MEDIA_QUERY = "(min-width: 768px)";

interface SidebarLayoutProps {
  /**
   * Navigation content. Renders inside the sticky rail on wider viewports and
   * inside the drawer on mobile. Scrolls independently when it outgrows the
   * viewport.
   */
  sidebar: ReactNode;
  /**
   * Title region — rendered at the top of the rail, in the collapsed mobile
   * bar, and at the top of the drawer. Typically the page's title or wordmark.
   */
  sidebarHeader?: ReactNode;
  /**
   * Utility region pinned to the bottom edge of the rail and the drawer —
   * theme toggles, language pickers, and similar app-level controls. The nav
   * between the header and this region takes the free space, so the utilities
   * always sit at the sidebar's bottom edge regardless of how tall the nav is.
   */
  sidebarFooter?: ReactNode;
  /**
   * Accessible name for the mobile menu button and the open drawer dialog.
   * Required — the package ships no i18n, so the consumer supplies the
   * localized string.
   */
  menuLabel: string;
  /** Accessible label for the drawer's close button. */
  closeLabel: string;
  children: ReactNode;
  /**
   * Caps the centered content column. Defaults to the shared site content width;
   * pass a narrower value for prose-heavy pages.
   */
  contentMaxInlineSize?: string;
  /**
   * Inline size of the rail column on wider viewports.
   * @default "200px"
   */
  sidebarInlineSize?: string;
  /**
   * Landmark element for the content region. Use `"main"` (the default) for the
   * page's primary content, or `"div"` when the shell is nested inside a surface
   * that already owns the `<main>` landmark.
   * @default "main"
   */
  as?: "main" | "div";
}

/**
 * Inline glyphs matching the Phosphor "List"/"X" icon metrics (256 viewBox,
 * 16-unit round-capped strokes, 1em box) so the default affordances render
 * identically without the icon dependency. Decorative — the buttons carry
 * their accessible names via `menuLabel` / `closeLabel`.
 */
function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M40 64h176M40 128h176M40 192h176"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full-bleed, app-density page shell with a full-height navigation rail. On
 * wider viewports the rail bleeds to the top, start, and bottom edges of the
 * viewport and sticks there as the page scrolls — title on top, navigation
 * filling the middle (scrolling on its own when it outgrows the rail), and
 * utilities pinned at the bottom edge — separated from the content by a
 * hairline border. The content column keeps a readable max width beside it,
 * with its own padding rather than a page-wide frame. On mobile the rail
 * collapses into a compact top bar whose menu button opens the same content as
 * a drawer (focus-trapped, scroll-locked, dismissed by Escape, backdrop, or
 * following a link).
 *
 * The rail width is overridable per page and defaults to a shared value so
 * existing callers render unchanged.
 */
export function SidebarLayout({
  sidebar,
  sidebarHeader,
  sidebarFooter,
  menuLabel,
  closeLabel,
  children,
  contentMaxInlineSize,
  sidebarInlineSize,
  as = "main",
}: SidebarLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen,
    dialogRef: drawerRef,
    onClose: () => {
      setIsOpen(false);
    },
  });

  // The drawer only exists below the md breakpoint. If the viewport crosses it
  // while open, the panel morphs back into the always-visible rail via CSS, so
  // drop the open state too — otherwise the scroll lock and focus trap would
  // keep acting on what is now a plain column.
  useEffect(() => {
    if (!isOpen) return;
    const mediaQueryList = window.matchMedia(MD_MEDIA_QUERY);
    const closeOnDesktop = () => {
      if (mediaQueryList.matches) setIsOpen(false);
    };
    closeOnDesktop();
    mediaQueryList.addEventListener("change", closeOnDesktop);
    return () => {
      mediaQueryList.removeEventListener("change", closeOnDesktop);
    };
  }, [isOpen]);

  // Lock page scroll while the drawer is open. Deliberately hand-rolled (not
  // react-remove-scroll): a plain body style keeps the component's DOM
  // structure identical across open/close, so toggling never perturbs
  // ancestors like React's <ViewTransition> with a changed child set, and the
  // drawer's own nav keeps scrolling since only the body is clamped.
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const content = (
    <div
      css={styles.content}
      style={
        contentMaxInlineSize
          ? { maxInlineSize: contentMaxInlineSize }
          : undefined
      }
    >
      {children}
    </div>
  );

  return (
    <div
      css={[
        styles.root,
        dynamicStyles.columns(sidebarInlineSize ?? DEFAULT_SIDEBAR_INLINE_SIZE),
      ]}
    >
      <div css={styles.mobileBar}>
        <div css={styles.mobileBarTitle}>{sidebarHeader}</div>
        <IconButton
          icon={<MenuIcon />}
          aria-label={menuLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen(true);
          }}
        />
      </div>
      {/* Backdrop and drawer stay mounted so the slide/fade can transition in
          both directions; `visibility` flips (delayed on close) to keep the
          closed drawer out of the focus order and accessibility tree. */}
      <div
        css={[styles.backdrop, isOpen && styles.backdropOpen]}
        onClick={() => {
          setIsOpen(false);
        }}
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
            setIsOpen(false);
          }
        }}
      >
        <div css={styles.railHeader}>
          <div css={styles.railTitle}>{sidebarHeader}</div>
          <IconButton
            css={styles.railClose}
            icon={<CloseIcon />}
            aria-label={closeLabel}
            onClick={() => {
              setIsOpen(false);
            }}
          />
        </div>
        <ScrollFade orientation="vertical" css={styles.railNav}>
          {sidebar}
        </ScrollFade>
        {sidebarFooter != null && (
          <div css={styles.railFooter}>{sidebarFooter}</div>
        )}
      </div>
      {as === "main" ? (
        <main css={styles.contentArea}>{content}</main>
      ) : (
        <div css={styles.contentArea}>{content}</div>
      )}
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    // Wider viewports stretch the rail to the grid row so it can fill the
    // viewport height and pin its footer to the bottom edge; mobile only has
    // the content column in flow (the rail is a fixed drawer), so alignment is
    // moot there.
    alignItems: { default: "start", [breakpoints.md]: "stretch" },
    // Mobile keeps a compact gap between stacked rows; on wider viewports the
    // rail bleeds to the edges and the content column owns its own padding, so
    // the grid itself adds no gap or frame.
    gap: { default: space._4, [breakpoints.md]: 0 },
    // The mobile shell clears the fixed pill bar and insets its content from
    // the safe areas. On wider viewports the frame is dropped entirely: the
    // rail bleeds to the top, start, and bottom edges and the content area
    // carries its own padding.
    paddingBlockStart: {
      default: `calc(${space._10} + env(safe-area-inset-top))`,
      [breakpoints.md]: 0,
    },
    paddingBlockEnd: {
      default: `calc(${space._8} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: 0,
    },
    paddingInlineStart: {
      default: `calc(${space._3} + env(safe-area-inset-left))`,
      [breakpoints.md]: 0,
    },
    paddingInlineEnd: {
      default: `calc(${space._3} + env(safe-area-inset-right))`,
      [breakpoints.md]: 0,
    },
  },
  // Collapsed mobile chrome: a floating pill with the title and the menu
  // button. Fixed (a sticky grid item can't escape its own-height row), with
  // the shell's mobile block-start padding sized to clear it. The inset is
  // uniform so the title region and the menu button sit at the same distance
  // from every pill edge.
  mobileBar: {
    display: { default: "flex", [breakpoints.md]: "none" },
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    position: "fixed",
    insetBlockStart: `calc(${space._2} + env(safe-area-inset-top))`,
    insetInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    insetInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
    zIndex: layer.header,
    padding: space._1,
    backgroundColor: color.bgSurface,
    borderRadius: border.radius_round,
    boxShadow: shadow._2,
    minInlineSize: 0,
  },
  mobileBarTitle: {
    minInlineSize: 0,
  },
  // The backdrop and drawer animate `visibility` alongside opacity/transform:
  // CSS keeps a transitioning element visible until the transition ends, so
  // the exit plays out and the hidden element still drops out of the focus
  // order and accessibility tree — no delays needed. Transition values are
  // literal strings: interpolating the `duration`/`easing` consts from
  // another `.stylex.ts` module compiles to undefined `var()` references,
  // which unsets the whole declaration (only same-module interpolation is
  // safe). Timings mirror `duration._300`/`_150` and `easing.entrance`.
  backdrop: {
    display: { default: "block", [breakpoints.md]: "none" },
    position: "fixed",
    inset: 0,
    zIndex: layer.tooltip,
    backgroundColor: color.bgScrim,
    opacity: 0,
    visibility: "hidden",
    pointerEvents: "none",
    transition: {
      default: "opacity 300ms ease, visibility 300ms",
      [motionConstants.REDUCED_MOTION]: "opacity 150ms ease, visibility 150ms",
    },
  },
  backdropOpen: {
    opacity: 1,
    visibility: "visible",
    pointerEvents: "auto",
  },
  // One element plays two roles: an end-edge drawer below md (off-canvas
  // until opened, sliding in from the same side as the menu button) and the
  // sticky rail column at md and above. Under reduced motion the slide is
  // dropped and only the fade plays. Both supported locales are LTR, so the
  // off-canvas translate doesn't need a logical flip.
  rail: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    minInlineSize: 0,
    position: { default: "fixed", [breakpoints.md]: "sticky" },
    // md+: the sticky rail pins to the very top and stretches to the grid row
    // (capped at the viewport) so it fills the height and its footer reaches
    // the bottom edge. Mobile: top and bottom both pinned → a full-height
    // off-canvas drawer.
    insetBlockStart: { default: 0, [breakpoints.md]: 0 },
    insetBlockEnd: { default: 0, [breakpoints.md]: "auto" },
    insetInlineEnd: { default: 0, [breakpoints.md]: "auto" },
    alignSelf: { default: "auto", [breakpoints.md]: "stretch" },
    maxBlockSize: { default: "none", [breakpoints.md]: "100dvh" },
    inlineSize: {
      default: `min(${space._14}, 85vw)`,
      [breakpoints.md]: "auto",
    },
    zIndex: { default: layer.tooltip, [breakpoints.md]: layer.content },
    paddingBlockStart: {
      default: `calc(${space._3} + env(safe-area-inset-top))`,
      [breakpoints.md]: space._2,
    },
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-bottom))`,
    },
    paddingInlineStart: {
      default: space._3,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-left))`,
    },
    paddingInlineEnd: {
      default: `calc(${space._3} + env(safe-area-inset-right))`,
      [breakpoints.md]: space._2,
    },
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: "transparent",
    },
    borderStartStartRadius: { default: border.radius_3, [breakpoints.md]: 0 },
    borderEndStartRadius: { default: border.radius_3, [breakpoints.md]: 0 },
    // md+: a hairline right border separates the rail from the content in place
    // of the mobile drawer's shadow.
    borderInlineEndWidth: { default: 0, [breakpoints.md]: border.size_1 },
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.neutralBorder,
    boxShadow: { default: shadow._6, [breakpoints.md]: "none" },
    transform: {
      default: "translateX(110%)",
      [motionConstants.REDUCED_MOTION]: "none",
      [breakpoints.md]: "none",
    },
    opacity: { default: 0, [breakpoints.md]: 1 },
    visibility: { default: "hidden", [breakpoints.md]: "visible" },
    transition: {
      default:
        "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms cubic-bezier(0.32, 0.72, 0, 1), visibility 300ms",
      [motionConstants.REDUCED_MOTION]: "opacity 150ms ease, visibility 150ms",
      [breakpoints.md]: "none",
    },
  },
  railOpen: {
    transform: "none",
    opacity: 1,
    visibility: "visible",
  },
  railHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    flexShrink: 0,
    minInlineSize: 0,
  },
  railTitle: {
    minInlineSize: 0,
  },
  railClose: {
    display: { default: "inline-flex", [breakpoints.md]: "none" },
  },
  railNav: {
    // Takes the free space between the header and footer so the utilities pin
    // to the rail's bottom edge. The `ScrollFade` wrapper owns the overflow,
    // the shrink-to-scroll min-size, and the scroll-aware edge fade.
    flexGrow: 1,
    overscrollBehavior: "contain",
    // The native scrollbar shows only while the nav actually overflows. Bleed
    // the scroll container's end edge out over the rail's inline padding so the
    // scrollbar sits flush against the rail's border, then pad the content back
    // in by the same amount so the links keep their inset.
    marginInlineEnd: { default: 0, [breakpoints.md]: `calc(-1 * ${space._2})` },
    paddingInlineEnd: { default: 0, [breakpoints.md]: space._2 },
  },
  railFooter: {
    flexShrink: 0,
  },
  contentArea: {
    minInlineSize: 0,
    // md+: the content owns its padding now that the rail bleeds to the edges
    // and the root drops its frame. The inline-start value gives the content
    // breathing room from the rail's border; the block values keep a compact
    // reading offset from the top and clear the bottom safe area. Mobile takes
    // its insets from the root frame, so these stay unset there.
    paddingBlockStart: { default: 0, [breakpoints.md]: space._4 },
    paddingBlockEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._8} + env(safe-area-inset-bottom))`,
    },
    paddingInlineStart: { default: 0, [breakpoints.md]: space._8 },
    paddingInlineEnd: {
      default: 0,
      [breakpoints.md]: `calc(${space._6} + env(safe-area-inset-right))`,
    },
  },
  content: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    minInlineSize: 0,
  },
});

// Dynamic tuning: StyleX generates the CSS variable and its reference, so the
// rail width participates in the responsive grid track. The value is a runtime
// arg, defaulted by the caller.
const dynamicStyles = stylex.create({
  columns: (sidebarInlineSize: string) => ({
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `${sidebarInlineSize} minmax(0, 1fr)`,
    },
  }),
});
