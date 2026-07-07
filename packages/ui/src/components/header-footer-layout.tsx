import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { layer, layout, space } from "../tokens.stylex.ts";

interface HeaderFooterLayoutProps {
  /**
   * Start (leading) region of the fixed header bar — typically a back or home
   * affordance. Only the region accepts pointer events, so the bar itself never
   * blocks the content scrolling beneath it.
   */
  headerStart?: ReactNode;
  /**
   * End (trailing) region of the fixed header bar — typically utility controls
   * such as a theme toggle or language picker.
   */
  headerEnd?: ReactNode;
  /**
   * Full-bleed decoration rendered behind the content and beneath the header
   * bar — gradients, glows, texture. Pointer-transparent and clipped to the
   * page. Pass positioned elements (e.g. an element pinned to the top and one
   * to the bottom); the slot fills the whole shell.
   */
  background?: ReactNode;
  /**
   * Footer element, rendered at the bottom of the page in the same centered
   * measure as a reading column. Pass a `<footer>` (e.g. the site footer); the
   * shell doesn't add its own landmark, so the element you pass owns the
   * `contentinfo` role.
   */
  footer?: ReactNode;
  children: ReactNode;
  /**
   * Caps the content into the site's default reading column — centered, with
   * reading gutters. Left off, the content is full-bleed and manages its own
   * width (media heroes, app canvases). The footer is always centered.
   */
  readingColumn?: boolean;
  /**
   * Narrows the reading column below the site default (prose-heavy pages).
   * Implies `readingColumn`.
   */
  contentMaxInlineSize?: string;
  /**
   * Landmark element for the content region. Use `"main"` (the default) for the
   * page's primary content, or `"div"` when the shell is nested inside a surface
   * that already owns the `<main>` landmark.
   * @default "main"
   */
  as?: "main" | "div";
}

/**
 * Reading-and-content page shell: a fixed, pointer-transparent header bar whose
 * start/end regions align to the site's centered measure, an optional full-bleed
 * background layer beneath it, content that flows *under* the bar (heroes and
 * backdrops bleed to the top edge; text pages add their own clearance), and an
 * optional footer pinned to the bottom of the same measure.
 *
 * This is the shell behind the site's header/footer pages. For dense, app-like
 * surfaces with their own navigation, reach for `SidebarLayout` instead — a page
 * uses one shell or the other, never both.
 */
export function HeaderFooterLayout({
  headerStart,
  headerEnd,
  background,
  footer,
  children,
  readingColumn,
  contentMaxInlineSize,
  as = "main",
}: HeaderFooterLayoutProps) {
  const isColumn = readingColumn === true || contentMaxInlineSize != null;
  const columnWidth = contentMaxInlineSize
    ? { maxInlineSize: contentMaxInlineSize }
    : undefined;
  const contentBody =
    as === "main" ? (
      <main
        css={[styles.content, isColumn && styles.column]}
        style={columnWidth}
      >
        {children}
      </main>
    ) : (
      <div
        css={[styles.content, isColumn && styles.column]}
        style={columnWidth}
      >
        {children}
      </div>
    );

  return (
    <div css={styles.root}>
      {background != null && (
        <div css={styles.background} aria-hidden="true">
          {background}
        </div>
      )}
      <header css={styles.header}>
        <div css={styles.headerNav}>
          <div css={styles.headerGroup}>{headerStart}</div>
          <div css={styles.headerGroup}>{headerEnd}</div>
        </div>
      </header>
      {contentBody}
      {footer != null && <div css={styles.footer}>{footer}</div>}
    </div>
  );
}

const styles = stylex.create({
  // A stacking context of its own so the background layer stays behind the
  // content and footer without leaking z-index into the rest of the page.
  root: {
    position: "relative",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    minBlockSize: "100dvh",
  },
  // Full-bleed decoration layer. Positioned elements passed in anchor to the
  // whole shell; it never intercepts input and is clipped to the page.
  background: {
    position: "absolute",
    inset: 0,
    zIndex: layer.base,
    pointerEvents: "none",
    overflow: "hidden",
  },
  // Fixed bar aligned to the same centered measure as the content. Pointer
  // events stay off so only the slot regions intercept input, and the
  // scrollbar-compensation var (set by scroll-locking overlays) keeps the bar
  // from shifting when a dialog locks the page.
  header: {
    position: "fixed",
    insetBlockStart: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    blockSize: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBlockStart: "env(safe-area-inset-top)",
    zIndex: layer.header,
    pointerEvents: "none",
    paddingInlineEnd: "var(--removed-body-scroll-bar-size, 0px)",
  },
  headerNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    blockSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
    pointerEvents: "none",
  },
  headerGroup: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    pointerEvents: "all",
  },
  // Content sits above the background layer and grows so a short page still
  // pushes the footer to the bottom of the viewport. No top offset: heroes and
  // backdrops bleed under the bar; pages that want clearance add their own.
  content: {
    position: "relative",
    zIndex: layer.content,
    flexGrow: 1,
    minInlineSize: 0,
  },
  // Reading-column treatment, opt-in via `readingColumn` / `contentMaxInlineSize`.
  // Defaults to the site measure; an inline `maxInlineSize` narrows it further.
  column: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  // Footer shares the centered measure and reading gutters with the content.
  footer: {
    position: "relative",
    zIndex: layer.content,
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
});
