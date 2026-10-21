"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { sidebarLayoutTokens } from "@tuja/ui/components/sidebar-layout.stylex";
import { useScrollRegion } from "@tuja/ui/hooks/use-scroll-region";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import {
  createContext,
  use,
  useState,
  ViewTransition,
  type ReactNode,
  type RefCallback,
} from "react";

const MasterScrollerContext = createContext<HTMLElement | null | undefined>(
  undefined,
);

/**
 * The box that scrolls the list beside a detail pane: `undefined` where the
 * page scrolls the list, and `null` until the box mounts. Give it to a
 * virtual list as its scroll parent.
 */
export function useMasterScroller() {
  return use(MasterScrollerContext);
}

interface MasterDetailColumnsProps {
  /** The list. */
  master: ReactNode;
  /** Changes when the list shows another view, such as a reorder mode: the list then starts at the top. */
  masterKey?: string;
  /** Names the pane. */
  detailLabel: string;
  /**
   * Changes when the pane shows other content, such as another selected row:
   * the old content fades out before the new content fades in, and the new
   * content starts at the top.
   */
  detailKey?: string | null;
  /** Makes the pane as tall as the screen, not only as tall as its content. */
  fillPane?: boolean;
  /** StyleX styles merged over the columns, such as `gridTemplateColumns`. */
  css: StyleProp;
  /** StyleX styles merged over the pane's scroller, such as its padding. */
  paneScrollerCss?: StyleProp;
  /** What the pane shows. */
  children: ReactNode;
}

/**
 * A list beside its detail pane, at `lg` and wider. The columns fill the
 * height of the screen, and the list and the pane each scroll in their own
 * box, so that each scrollbar is next to what it scrolls.
 */
export function MasterDetailColumns({
  master,
  masterKey,
  detailLabel,
  detailKey,
  fillPane = false,
  css,
  paneScrollerCss,
  children,
}: MasterDetailColumnsProps) {
  const [masterScroller, setMasterScroller] = useState<HTMLElement | null>(
    null,
  );
  return (
    <div css={[styles.root, css]}>
      <RegionScroller
        key={masterKey}
        scrollerRef={setMasterScroller}
        css={styles.master}
      >
        <MasterScrollerContext value={masterScroller}>
          {master}
        </MasterScrollerContext>
      </RegionScroller>
      <div css={[flex.col, styles.paneColumn]}>
        <aside
          aria-label={detailLabel}
          css={[
            corner.radius_4,
            flex.col,
            styles.pane,
            fillPane && styles.fill,
          ]}
        >
          {/* The browser draws a view transition snapshot above the page, out
              of the clip of the card. Thus the snapshot is of the scroller,
              which clips its own content, and not of the content. */}
          <ViewTransition
            key={detailKey ?? undefined}
            enter="master-detail-swap"
            exit="master-detail-swap"
            default="none"
          >
            <RegionScroller
              css={[corner.radius_4, styles.paneScroller, paneScrollerCss]}
              contentCss={[flex.col, styles.paneContent]}
            >
              {children}
            </RegionScroller>
          </ViewTransition>
        </aside>
      </div>
    </div>
  );
}

function RegionScroller({
  scrollerRef,
  css,
  contentCss,
  children,
}: {
  scrollerRef?: RefCallback<HTMLElement>;
  css: StyleProp;
  contentCss?: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(scroller, scrollerRef)}
      css={[styles.scroller, css]}
    >
      <div ref={content} css={[styles.content, contentCss]}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The page does not scroll: the columns cancel the block padding of the
  // shell and take the height of the screen.
  root: {
    display: "grid",
    gap: rhythm.group,
    blockSize: "100dvh",
    marginBlockStart: `calc(-1 * ${sidebarLayoutTokens.contentPaddingBlockStart})`,
    marginBlockEnd: `calc(-1 * ${sidebarLayoutTokens.contentPaddingBlockEnd})`,
  },
  scroller: {
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
  },
  // The rows of a plain list reach `space._2` into the gutter (`bleed.rows`).
  // The scroller goes out by the same amount, so that it does not clip them.
  master: {
    minInlineSize: 0,
    marginInline: `calc(-1 * ${space._2})`,
    paddingInline: space._2,
    paddingBlockStart: sidebarLayoutTokens.contentPaddingBlockStart,
    paddingBlockEnd: sidebarLayoutTokens.contentPaddingBlockEnd,
  },
  paneColumn: {
    minBlockSize: 0,
    paddingBlock: space._4,
  },
  pane: {
    minBlockSize: 0,
    overflow: "clip",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  fill: {
    flexGrow: 1,
  },
  paneScroller: {
    flexGrow: 1,
    minBlockSize: 0,
    padding: space._5,
  },
  paneContent: {
    minBlockSize: "100%",
  },
});
