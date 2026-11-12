"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode, type RefCallback } from "react";
import { EffectCarrier } from "../../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../../effect-layer/use-scroll-region.ts";
import { mergeRefs } from "../../merge-refs.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { islandSurface } from "../../surfaces/island.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { STACK_ROOT_KEY } from "../create-page-scroll.ts";
import { columnPageScrollStyles, columnStyles } from "./column.stylex.ts";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewDetail,
  SplitViewColumnState,
} from "./types.ts";
import { SplitViewColumnContext } from "./use-split-view-column.ts";

/**
 * One page of a column, and its part in the motion.
 *
 * @internal
 */
export interface ColumnPage {
  key: string;
  role: "under" | "current" | "leaving";
  column: NavigationSplitViewColumn | NavigationSplitViewDetail;
  /** The part of the page in the stack, where it is the sidebar at its root. */
  stack?: "root" | "under";
  leftAs?: "skeleton" | "blank" | "copy";
}

/** @internal */
export type ColumnPageScroll = "never" | "narrow";

interface ColumnProps {
  column: SplitViewColumnState["column"];
  /** The landmark of the column. */
  as?: "main" | "section";
  /** Whether the page scrolls the column instead of its scroller. */
  pageScrolls: boolean;
  /**
   * Where the view can leave the scroll of the column to the page: nowhere, as
   * in a box that does not fill the screen, or on a screen narrower than 30rem.
   */
  pageScroll: ColumnPageScroll;
  /** Whether the view shows the column now, for `useSplitViewColumn`. */
  isShown: boolean;
  /** How the column shows, for `useSplitViewColumn`. */
  presentation?: "column" | "page";
  label: string;
  /**
   * The pages of the column, by key: the page that shows, and the pages
   * that a motion still shows. Each page keeps its scroll while it stays.
   */
  pages: readonly ColumnPage[];
  close: (() => void) | null;
  /** Whether the column leaves the view, and shows only while it moves out. */
  isLeaving?: boolean;
  header?: ReactNode;
  /** What a page shows above its node, such as its back link. */
  top?: (page: ColumnPage) => ReactNode;
  /** What stays at the bottom of the column, under its pages. */
  footer?: ReactNode;
  /**
   * Whether the column draws the destinations of the `TabView` around its node:
   * at each width where it shows beside the content, or only where a detail
   * fits beside them too.
   */
  carriesNav?: "always" | "wide";
  /** Where the column does not show at all, after every other style. */
  awayCss?: StyleProp;
  /** What a page shows, where that is not its node. */
  body?: (page: ColumnPage) => ReactNode;
  css: StyleProp;
  pageCss?: StyleProp;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
}

/** @internal */
export function Column({
  column,
  as: Landmark = "section",
  pageScrolls,
  pageScroll,
  isShown,
  presentation = "column",
  label,
  pages,
  close,
  isLeaving = false,
  header,
  top,
  footer,
  carriesNav,
  awayCss,
  body,
  css,
  pageCss,
  scrollerCss,
  contentCss,
}: ColumnProps) {
  return (
    <Landmark
      aria-label={label}
      tabIndex={-1}
      inert={isLeaving}
      data-split-view-column={column}
      data-split-view-sidebar={column === "sidebar" ? "" : undefined}
      data-split-view-nav={carriesNav}
      {...stylex.props(
        islandSurface.base,
        columnStyles.column,
        a11y.focusRingInset,
        css,
        awayCss,
      )}
    >
      {header}
      <div data-split-view-pages="" css={columnStyles.pages}>
        {pages.map((page) => (
          <ColumnPageView
            key={page.key}
            column={column}
            pageScrolls={pageScrolls}
            pageScroll={pageScroll}
            isShown={isShown}
            presentation={presentation}
            page={page}
            close={page.role === "current" ? close : null}
            pageCss={pageCss}
            scrollerCss={scrollerCss}
            contentCss={contentCss}
            top={top}
            body={body}
          />
        ))}
      </div>
      {footer}
      {column === "sidebar" ? null : (
        <span data-split-view-edge="" aria-hidden css={columnStyles.edge} />
      )}
    </Landmark>
  );
}

function ColumnPageView({
  column,
  pageScrolls,
  pageScroll,
  isShown,
  presentation,
  page,
  close,
  pageCss,
  scrollerCss,
  contentCss,
  top,
  body,
}: {
  column: SplitViewColumnState["column"];
  pageScrolls: boolean;
  pageScroll: ColumnPageScroll;
  isShown: boolean;
  presentation: "column" | "page";
  page: ColumnPage;
  close: (() => void) | null;
  pageCss?: StyleProp;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  top?: (page: ColumnPage) => ReactNode;
  body?: (page: ColumnPage) => ReactNode;
}) {
  const [box, setBox] = useState<HTMLElement | null>(null);
  const scroller = pageScrolls ? undefined : box;
  const isCurrent = page.role === "current";
  const scrollStyles = pageScroll === "never" ? null : columnPageScrollStyles;
  const accessory = "accessory" in page.column ? page.column.accessory : null;
  return (
    <div
      data-split-view-page={page.role}
      data-split-view-page-key={
        page.stack === undefined ? page.key : STACK_ROOT_KEY
      }
      data-split-view-stack={page.stack}
      inert={!isCurrent}
      aria-hidden={isCurrent ? undefined : true}
      css={[
        columnStyles.page,
        scrollStyles?.page,
        !isCurrent && columnStyles.pageAside,
        !isCurrent && scrollStyles?.pageAside,
        pageCss,
      ]}
    >
      <SplitViewColumnContext
        value={{ column, presentation, scroller, isShown, close }}
      >
        <RegionScroller
          scrollerRef={setBox}
          scrollerCss={[scrollStyles?.scroller, scrollerCss]}
          contentCss={[scrollStyles?.content, contentCss]}
        >
          {top?.(page)}
          {body === undefined ? page.column.node : body(page)}
          {accessory == null ? null : <Accessory>{accessory}</Accessory>}
        </RegionScroller>
      </SplitViewColumnContext>
      <span data-split-view-dim="" aria-hidden css={columnStyles.dim} />
      <span data-split-view-edge="" aria-hidden css={columnStyles.edge} />
    </div>
  );
}

function RegionScroller({
  scrollerRef,
  scrollerCss,
  contentCss,
  children,
}: {
  scrollerRef: RefCallback<HTMLElement>;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(scroller, scrollerRef)}
      css={[columnStyles.scroller, a11y.focusRingInset, scrollerCss]}
    >
      <div ref={content} css={[columnStyles.content, contentCss]}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

function Accessory({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[columnStyles.accessory, css]}>
      <EffectCarrier value={sticky}>
        <div css={columnStyles.accessoryControl}>{children}</div>
      </EffectCarrier>
    </div>
  );
}
