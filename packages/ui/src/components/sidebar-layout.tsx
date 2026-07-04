import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { layer, layout, space } from "../tokens.stylex.ts";

// Default width of the navigation rail on wider viewports.
const DEFAULT_SIDEBAR_INLINE_SIZE = "200px";

// Default sticky offset that pins the rail just beneath the fixed page header.
const DEFAULT_STICKY_INSET_BLOCK_START = `calc(env(safe-area-inset-top) + ${space._10} + ${space._1})`;

interface SidebarLayoutProps {
  /**
   * Navigation rail. Renders as a sticky vertical column beside the content on
   * wider viewports and collapses to a sticky bar above the content on mobile.
   * The slot owns its own surface treatment so each page can theme its rail.
   */
  sidebar: ReactNode;
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
   * Logical block-start offset the sticky rail pins to. Defaults to a value that
   * clears the fixed page header plus the top safe-area inset.
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
 * Full-bleed page shell with a sticky navigation rail. The rail hugs the start
 * edge while the content column keeps a readable max width and stays centered in
 * the space beside it, so the layout uses the whole viewport without letting
 * content sprawl. Reusable across pages — supply a `sidebar` and the content.
 *
 * The rail width and sticky offset are overridable per page; both default to the
 * shared values so existing callers render unchanged.
 */
export function SidebarLayout({
  sidebar,
  children,
  contentMaxInlineSize,
  sidebarInlineSize,
  stickyInsetBlockStart,
  as = "main",
}: SidebarLayoutProps) {
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
      <div
        css={[
          styles.sidebar,
          dynamicStyles.stickyOffset(
            stickyInsetBlockStart ?? DEFAULT_STICKY_INSET_BLOCK_START,
          ),
        ]}
      >
        {sidebar}
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
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBlockEnd: `calc(${space._8} + env(safe-area-inset-bottom))`,
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  sidebar: {
    position: "sticky",
    alignSelf: "start",
    zIndex: layer.content,
    minInlineSize: 0,
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
// the rail width participates in the responsive grid track and the sticky offset
// stays a logical property. Values are runtime args, defaulted by the caller.
const dynamicStyles = stylex.create({
  columns: (sidebarInlineSize: string) => ({
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `${sidebarInlineSize} minmax(0, 1fr)`,
    },
  }),
  stickyOffset: (stickyInsetBlockStart: string) => ({
    insetBlockStart: stickyInsetBlockStart,
  }),
});
