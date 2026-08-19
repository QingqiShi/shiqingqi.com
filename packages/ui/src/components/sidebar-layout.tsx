"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { scrollbar } from "../primitives/layout.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  transition,
} from "../primitives/motion.stylex.ts";
import {
  border,
  color,
  layer,
  layout,
  shadow,
  space,
} from "../tokens.stylex.ts";
import { IconButton } from "./icon-button.tsx";
import { ScrollMask } from "./scroll-mask.tsx";

// Default width of the navigation rail on wider viewports — wide enough for
// the nav labels used across the app to sit on one line, including once a
// classic scrollbar claims its reserved gutter from the rail. `rem`-based, so
// the rail grows with the labels when the user raises their browser font size
// (WCAG 1.4.4) instead of wrapping them.
const DEFAULT_SIDEBAR_INLINE_SIZE = space._13;

// The drawer only exists below `breakpoints.md`, the rail column at or above
// it. Derived from the breakpoint rather than restated, so the JS-side check
// cannot drift from the style-side one — `matchMedia` takes the bare condition,
// while the StyleX const carries the `@media ` prefix.
const MD_MEDIA_QUERY = breakpoints.md.replace("@media ", "");

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
   * @default space._13 (15rem)
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
 * Inline icons matching the Phosphor "List"/"X" icon metrics (256 viewBox,
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
 * App-density page shell: a persistent navigation rail beside a centered
 * content column on wider viewports, collapsing on mobile into a top bar whose
 * menu button opens the rail as a drawer (focus-trapped, scroll-locked,
 * dismissed by Escape, backdrop, or following a link).
 *
 * The rail width is overridable per page via `sidebarInlineSize`.
 *
 * The rail fills its container's height (capped at the viewport), so the shell
 * works dropped into any bounded box — a split pane, the row beneath a spanning
 * header — not only at the page root where the container is the viewport.
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
      css={[
        styles.content,
        contentMaxInlineSize
          ? dynamicStyles.maxInlineSize(contentMaxInlineSize)
          : null,
      ]}
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
      <div css={[corner.radius_round, styles.mobileBar]}>
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
        {/* Header and footer ride in ScrollMask's chrome slots, so the nav
            bleeds under them to the rail's block edges and scrolled-away
            links blur progressively across the chrome rather than stopping
            where a header box would begin. */}
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
                icon={<CloseIcon />}
                aria-label={closeLabel}
                onClick={() => {
                  setIsOpen(false);
                }}
              />
            </div>
          }
          endChrome={
            sidebarFooter != null ? (
              <div css={styles.railFooter}>{sidebarFooter}</div>
            ) : undefined
          }
        >
          {sidebar}
        </ScrollMask>
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
    alignItems: { default: "start", [breakpoints.md]: "stretch" },
    gap: { default: space._4, [breakpoints.md]: 0 },
    // Mobile top padding clears the fixed pill bar.
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
    // md+: fill the container's height, not the viewport, so the rail and its
    // pinned footer track the container (inert at the page root, where the
    // height is indefinite). minBlockSize:0 lets it shrink as a grid/flex item.
    blockSize: { [breakpoints.md]: "100%" },
    minBlockSize: { [breakpoints.md]: 0 },
    gridTemplateRows: { [breakpoints.md]: "minmax(0, 1fr)" },
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
  // One element is both the mobile drawer and the md+ rail. Reduced motion
  // drops the slide and plays only the fade. Both supported locales are LTR, so
  // the off-canvas translate needs no logical flip.
  rail: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
    // The nav's scroll region bleeds to the card's block edges, so its bands
    // and scrolled content would otherwise paint square over the rounded
    // corners — clip everything to the squircle. Plain overflow clipping, not
    // clip-path: a clip-path would make the rail a backdrop root and cut the
    // bands' backdrop-filter off from the content beneath them.
    overflow: "clip",
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
    // No block padding: the scroll region reaches the card's block edges (the
    // screen's, as the drawer), and the chrome slots carry the block insets
    // the rail used to.
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
  // The slots carry the rail's old block padding on their outer edges and the
  // rail's old gap on their inner ones, so at rest the chrome and the nav sit
  // exactly where the flex column used to put them.
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
    // Spans the rail's whole block size — the header and footer are chrome
    // slots inside it. `ScrollMask` owns the overflow, the shrink-to-scroll
    // min-size, the Scroll mask at each edge, and pinning the footer to the
    // rail's bottom edge while the nav is short.
    flexGrow: 1,
    // The native scrollbar shows only while the nav actually overflows. Bleed
    // the scroll region's end edge out over the rail's inline padding so the
    // scrollbar sits flush against the rail's border, then pad the content back
    // in by the same amount so the links keep their inset.
    marginInlineEnd: { default: 0, [breakpoints.md]: `calc(-1 * ${space._2})` },
  },
  railNavContent: {
    overscrollBehavior: "contain",
    // Reserve the classic-scrollbar gutter up front (a no-op for overlay
    // scrollbars) so a nav that overflows never renders its links underneath
    // the scrollbar, and the link width stays constant whether or not the
    // scrollbar is present.
    scrollbarGutter: { default: "auto", [breakpoints.md]: "stable" },
    paddingInlineEnd: { default: 0, [breakpoints.md]: space._2 },
  },
  railFooter: {
    paddingBlockStart: space._2,
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-bottom))`,
    },
  },
  // Without a footer slot there is no chrome carrying the block-end inset, so
  // the scroller pads its own end and the plain end band sits at the card edge.
  railNavContentNoFooter: {
    paddingBlockEnd: {
      default: `calc(${space._3} + env(safe-area-inset-bottom))`,
      [breakpoints.md]: `calc(${space._2} + env(safe-area-inset-bottom))`,
    },
  },
  contentArea: {
    minInlineSize: 0,
    // md+ owns its padding (mobile insets come from the root frame). The
    // inline-start value is the gutter between rail and content.
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
  maxInlineSize: (maxInlineSize: string) => ({ maxInlineSize }),
});
