import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { layer, layout, space } from "../tokens.stylex.ts";

// Width of the navigation rail on wider viewports.
const SIDEBAR_WIDTH = "200px";

// Pins the rail just beneath the fixed page header.
const STICKY_TOP = `calc(env(safe-area-inset-top) + ${space._10} + ${space._1})`;

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
}

/**
 * Full-bleed page shell with a sticky navigation rail. The rail hugs the start
 * edge while the content column keeps a readable max width and stays centered in
 * the space beside it, so the layout uses the whole viewport without letting
 * content sprawl. Reusable across pages — supply a `sidebar` and the content.
 */
export function SidebarLayout({
  sidebar,
  children,
  contentMaxInlineSize,
}: SidebarLayoutProps) {
  return (
    <div css={styles.root}>
      <div css={styles.sidebar}>{sidebar}</div>
      <main css={styles.contentArea}>
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
      </main>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    alignItems: "start",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `${SIDEBAR_WIDTH} minmax(0, 1fr)`,
    },
    gap: { default: space._4, [breakpoints.md]: space._8 },
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBlockEnd: `calc(${space._8} + env(safe-area-inset-bottom))`,
    paddingInlineStart: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingInlineEnd: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  sidebar: {
    position: "sticky",
    top: STICKY_TOP,
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
