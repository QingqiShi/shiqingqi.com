import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { layer, layout, space } from "../tokens.stylex.ts";
import { BlurPlane, BlurPlaneProvider } from "./blur-plane.tsx";
import { HeaderControls } from "./header-controls.tsx";

interface HeaderFooterLayoutProps {
  /**
   * Start (leading) floating group at the top of the page — typically a back or
   * home affordance. Only the controls accept pointer events, so the group
   * never blocks the content scrolling beneath it. Left out, no group is
   * rendered.
   */
  headerStart?: ReactNode;
  /**
   * End (trailing) floating group at the top of the page — typically utility
   * controls such as a theme toggle or language picker. Left out, no group is
   * rendered.
   */
  headerEnd?: ReactNode;
  /**
   * Full-bleed decoration rendered behind the content and beneath the header
   * controls — gradients, glows, texture. Pointer-transparent and clipped to
   * the page. Pass positioned elements (e.g. an element pinned to the top and
   * one to the bottom); the slot fills the whole shell.
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
 * Reading-and-content page shell: two floating groups of header controls
 * aligned to the ends of the site's centered measure, an optional full-bleed
 * background layer beneath them, content that flows *under* them (heroes and
 * backdrops bleed to the top edge; text pages add their own clearance), and an
 * optional footer pinned to the bottom of the same measure.
 *
 * The controls float over the page rather than sitting on a bar: once the page
 * is scrolled away from the top, the page blurs around each group — strongest
 * against the controls, sharp again a little way out — so they read as lifted
 * off the content passing beneath them rather than as chrome the page stops at.
 * At rest the blur melts away and a hero bleeds to the top edge untouched. The
 * footer is in flow at the end of the page, where nothing floats over it.
 *
 * The blur is painted on the page's Blur plane, first inside the content: under
 * the header's groups, and under any sticky chrome the page parks at `raised`,
 * so no group's blur ever lands on another group's controls.
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
  // A stacking context of its own so the background layer stays behind the
  // content and footer without leaking z-index into the rest of the page.
  //
  // The custom property is where a floating control group sits from its end of
  // the viewport: half of whatever the viewport has over the measure puts it on
  // the measure's edge, and the gutter then holds it off that edge by the same
  // offset the content below keeps. A scroll-locking overlay removes the
  // scrollbar and reports its width here, so the groups hold still rather than
  // shifting with it. Percentages resolve where the property is used, against
  // each fixed group's containing block.
  root: {
    "--header-controls-gutter": `calc(max(0px, (100% - var(--removed-body-scroll-bar-size, 0px) - ${layout.maxInlineSize}) / 2) + ${space._3})`,
    // The strip the header controls occupy, published so page chrome that
    // sticks — a filter bar — parks under it rather than restating the shell's
    // own measurements.
    "--header-controls-clearance": `calc(${space._10} + env(safe-area-inset-top))`,
    position: "relative",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    minBlockSize: "100dvh",
  },
  // Full-bleed decoration layer. Positioned elements passed in anchor to the
  // whole shell; it never intercepts input and is clipped to the page. Its
  // corners are the shell root's, so the decoration rounds with a shell
  // dropped into a rounded box. The clip is safe here: this is a sibling
  // subtree of the header controls' blur, never above it.
  background: {
    position: "absolute",
    inset: 0,
    zIndex: layer.base,
    pointerEvents: "none",
    overflow: "hidden",
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // The `banner` landmark, and no box of its own: each control group places
  // itself, so the header is never the near-full-width fixed element at the
  // top edge that costs the browser's own treatment of it — see "Progressive
  // blur" in `CONTEXT.md`.
  header: {
    display: "contents",
  },
  // The shared gutter puts each group on its end of the measure. The end group
  // also clears the scrollbar a scroll lock has removed, which the gutter took
  // off the measure rather than off this edge.
  headerStart: {
    insetInlineStart:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-left))",
  },
  headerEnd: {
    insetInlineEnd:
      "calc(var(--header-controls-gutter) + env(safe-area-inset-right) + var(--removed-body-scroll-bar-size, 0px))",
  },
  // Content sits above the background layer and grows so a short page still
  // pushes the footer to the bottom of the viewport. No top offset: heroes and
  // backdrops bleed under the controls; pages that want clearance add their
  // own.
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

// `contentMaxInlineSize` narrows the reading column below the site default —
// a runtime value, so it composes as a dynamic style rather than an inline
// `style` attribute.
const dynamicStyles = stylex.create({
  maxInlineSize: (maxInlineSize: string) => ({ maxInlineSize }),
});
