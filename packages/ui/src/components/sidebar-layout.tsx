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

// Default width of the navigation rail on wider viewports.
const DEFAULT_SIDEBAR_INLINE_SIZE = "200px";

// Default sticky offset for the rail. The shell owns the whole page (no fixed
// header coexists with it), so the rail pins just below the top safe area.
const DEFAULT_STICKY_INSET_BLOCK_START = `calc(env(safe-area-inset-top) + ${space._4})`;

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
   * Utility region pinned to the bottom of the rail and the drawer — theme
   * toggles, language pickers, and similar app-level controls.
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
   * Logical block-start offset the sticky rail pins to. Defaults to a compact
   * offset below the top safe-area inset.
   */
  stickyInsetBlockStart?: string;
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
 * Full-bleed, app-density page shell with a sticky navigation rail. On wider
 * viewports the rail hugs the start edge — title on top, navigation in the
 * middle, utilities pinned to the bottom — while the content column keeps a
 * readable max width beside it. On mobile the rail collapses into a compact
 * top bar whose menu button opens the same content as a drawer (focus-trapped,
 * scroll-locked, dismissed by Escape, backdrop, or following a link).
 *
 * The rail width and sticky offset are overridable per page; both default to
 * shared values so existing callers render unchanged.
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
  stickyInsetBlockStart,
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

  const resolvedStickyOffset =
    stickyInsetBlockStart ?? DEFAULT_STICKY_INSET_BLOCK_START;

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
        css={[
          styles.rail,
          dynamicStyles.railOffsets(resolvedStickyOffset),
          isOpen && styles.railOpen,
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
        <div css={styles.railNav}>{sidebar}</div>
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
    alignItems: "start",
    gap: { default: space._4, [breakpoints.md]: space._8 },
    // Mobile clears the fixed pill bar; wider viewports only need a compact
    // offset since no fixed chrome coexists with the shell.
    paddingBlockStart: {
      default: `calc(${space._10} + env(safe-area-inset-top))`,
      [breakpoints.md]: `calc(${space._4} + env(safe-area-inset-top))`,
    },
    paddingBlockEnd: `calc(${space._8} + env(safe-area-inset-bottom))`,
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
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
    gap: space._4,
    minInlineSize: 0,
    position: { default: "fixed", [breakpoints.md]: "sticky" },
    insetBlockEnd: { default: 0, [breakpoints.md]: "auto" },
    insetInlineEnd: { default: 0, [breakpoints.md]: "auto" },
    inlineSize: {
      default: `min(${space._14}, 85vw)`,
      [breakpoints.md]: "auto",
    },
    zIndex: { default: layer.tooltip, [breakpoints.md]: layer.content },
    paddingBlockStart: {
      default: `calc(${space._3} + env(safe-area-inset-top))`,
      [breakpoints.md]: 0,
    },
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: 0,
    },
    paddingInlineStart: { default: space._3, [breakpoints.md]: 0 },
    paddingInlineEnd: {
      default: `calc(${space._3} + env(safe-area-inset-right))`,
      [breakpoints.md]: 0,
    },
    backgroundColor: {
      default: color.bgSurface,
      [breakpoints.md]: "transparent",
    },
    borderStartStartRadius: { default: border.radius_3, [breakpoints.md]: 0 },
    borderEndStartRadius: { default: border.radius_3, [breakpoints.md]: 0 },
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
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
    scrollbarWidth: "none",
  },
  railFooter: {
    flexShrink: 0,
  },
  contentArea: {
    minInlineSize: 0,
  },
  content: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    minInlineSize: 0,
  },
});

// Dynamic tuning: StyleX generates the CSS variables and their references, so
// the rail width participates in the responsive grid track and the sticky
// offset stays a logical property. Values are runtime args, defaulted by the
// caller.
const dynamicStyles = stylex.create({
  columns: (sidebarInlineSize: string) => ({
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `${sidebarInlineSize} minmax(0, 1fr)`,
    },
  }),
  railOffsets: (stickyInsetBlockStart: string) => ({
    insetBlockStart: { default: 0, [breakpoints.md]: stickyInsetBlockStart },
    // Mirrors the shell's block-end padding so a fully-scrolled page never
    // squeezes the rail out of its sticky position.
    maxBlockSize: {
      default: "none",
      [breakpoints.md]: `calc(100dvh - ${stickyInsetBlockStart} - ${space._8} - env(safe-area-inset-bottom))`,
    },
  }),
});
