import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { layer, layout, space } from "../tokens.stylex.ts";
import { BlurPlane, BlurPlaneProvider } from "./blur-plane.tsx";
import { HeaderControls } from "./header-controls.tsx";

interface HeaderFooterLayoutProps {
  /**
   * Start (leading) floating group at the top of the page — typically a back
   * or home affordance. Only the controls accept pointer events, so the group
   * never blocks the content scrolling beneath it.
   */
  headerStart?: ReactNode;
  /**
   * End (trailing) floating group at the top of the page — typically utility
   * controls such as a theme toggle or language picker.
   */
  headerEnd?: ReactNode;
  /**
   * Full-bleed decoration behind the content and beneath the header controls
   * — gradients, glows, texture. Pointer-transparent and clipped to the
   * shell; pass positioned elements, since the slot fills the whole shell.
   */
  background?: ReactNode;
  /**
   * Footer element, rendered at the bottom of the page in the same centered
   * measure as a reading column. Pass a `<footer>` (e.g. the site footer);
   * the shell doesn't add its own landmark, so the element you pass owns the
   * `contentinfo` role.
   */
  footer?: ReactNode;
  children: ReactNode;
  /**
   * Caps the content into the site's default reading column — centered, with
   * reading gutters. Left off, the content is full-bleed and manages its own
   * width; the footer stays centered either way.
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
 * Reading-and-content page shell: floating header control groups at the ends
 * of the site's centered measure, an optional full-bleed background, content
 * that flows under the header, and an optional footer at the end of the page.
 *
 * This is the shell behind the site's header/footer pages; reach for
 * `SidebarLayout` instead for dense, app-like pages with their own
 * navigation — a page uses one shell or the other, never both.
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
  const contentCss = [
    styles.content,
    isColumn && styles.column,
    contentMaxInlineSize
      ? dynamicStyles.maxInlineSize(contentMaxInlineSize)
      : null,
  ];
  const content = (
    <>
      <BlurPlane />
      {children}
    </>
  );
  const contentBody =
    as === "main" ? (
      <main css={contentCss}>{content}</main>
    ) : (
      <div css={contentCss}>{content}</div>
    );

  return (
    <BlurPlaneProvider>
      <div css={styles.root}>
        {background != null && (
          <div css={styles.background} aria-hidden="true">
            {background}
          </div>
        )}
        <header css={styles.header}>
          {headerStart != null && (
            <HeaderControls css={styles.headerStart}>
              {headerStart}
            </HeaderControls>
          )}
          {headerEnd != null && (
            <HeaderControls css={styles.headerEnd}>{headerEnd}</HeaderControls>
          )}
        </header>
        {contentBody}
        {footer != null && <div css={styles.footer}>{footer}</div>}
      </div>
    </BlurPlaneProvider>
  );
}

const styles = stylex.create({
  // The scroll lock reports its removed scrollbar width here, so the floating
  // groups hold still instead of shifting when the scrollbar disappears.
  root: {
    "--header-controls-gutter": `calc(max(0px, (100% - var(--removed-body-scroll-bar-size, 0px) - ${layout.maxInlineSize}) / 2) + ${space._3})`,
    // Published so sticky page chrome (e.g. a filter bar) can sit below the
    // header without restating its size.
    "--header-controls-clearance": `calc(${space._10} + env(safe-area-inset-top))`,
    position: "relative",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    minBlockSize: "100dvh",
  },
  // This box can clip: it sits beside the header controls' blur, not above
  // it, so the clip cannot strip the blur's mask.
  background: {
    position: "absolute",
    inset: 0,
    zIndex: layer.base,
    pointerEvents: "none",
    overflow: "hidden",
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // No box of its own: a near-full-width fixed header flattens the iOS
  // Safari status bar. See "Progressive blur" in `CONTEXT.md`.
  header: {
    display: "contents",
  },
  // Only headerEnd also clears the removed scrollbar width; the gutter above
  // already accounts for it on the measure, not this edge.
  headerStart: {
    insetInlineStart:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-left))",
  },
  headerEnd: {
    insetInlineEnd:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-right) + var(--removed-body-scroll-bar-size, 0px))",
  },
  // No top offset: heroes and backdrops bleed under the controls; pages that
  // want clearance add their own.
  content: {
    position: "relative",
    zIndex: layer.content,
    flexGrow: 1,
    minInlineSize: 0,
  },
  column: {
    inlineSize: "100%",
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
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

const dynamicStyles = stylex.create({
  maxInlineSize: (maxInlineSize: string) => ({ maxInlineSize }),
});
