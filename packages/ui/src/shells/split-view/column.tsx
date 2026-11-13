"use client";

import * as stylex from "@stylexjs/stylex";
import { useState, type ReactNode, type RefCallback } from "react";
import { EffectCarrier } from "../../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../../effect-layer/use-scroll-region.ts";
import { mergeRefs } from "../../merge-refs.ts";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { ScrollMask } from "../../surfaces/scroll-mask.tsx";
import { space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { STACK_ROOT_KEY } from "../create-page-scroll.ts";
import {
  columnStyles,
  cornerStyles,
  pageScrollStyles,
  stackedPageScrollStyles,
} from "./column.stylex.ts";
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
export type ColumnPageScroll = "never" | "stacked" | "always";

interface ColumnProps {
  column: SplitViewColumnState["column"];
  /** The landmark of the column. */
  as?: "main" | "section";
  /** Whether the page scrolls the column instead of its scroller. */
  pageScrolls: boolean;
  /**
   * Where the view leaves the scroll of the column to the page: nowhere, as in
   * a box that does not fill the screen, only where the column is a page of
   * the stack, or at each width.
   */
  pageScroll: ColumnPageScroll;
  /**
   * Whether the column stays on the screen while the page scrolls the content
   * beside it.
   */
  sticks?: boolean;
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
  /**
   * What stays at the top and at the bottom of the scroller of each page, over
   * the content, which blurs on its way out under them.
   */
  chrome?: { start: ReactNode; end: ReactNode };
  /** Where the chrome at the end is, where that is not the end of the scroller. */
  endChromeCss?: StyleProp;
  /** What a page shows above its node, such as its back link. */
  top?: (page: ColumnPage) => ReactNode;
  /**
   * Whether the column draws the destinations of the `TabView` around its node:
   * at each width where it shows beside the content, or only where a detail
   * fits beside them too.
   */
  carriesNav?: "always" | "wide";
  /**
   * Where the column has round corners at its inline start, because the
   * sidebar fill is beside it there. Without it, the column has none.
   */
  cornersCss?: StyleProp;
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
  sticks = false,
  isShown,
  presentation = "column",
  label,
  pages,
  close,
  isLeaving = false,
  header,
  chrome,
  endChromeCss,
  top,
  carriesNav,
  cornersCss,
  awayCss,
  body,
  css,
  pageCss,
  scrollerCss,
  contentCss,
}: ColumnProps) {
  const sticky = useEffectSticky();
  const { ref, css: stickyCss } = sticky;
  const parts = (
    <>
      {cornersCss == null ? null : (
        <span
          aria-hidden
          css={[cornerStyles.anchor, cornerStyles.blockStart, cornersCss]}
        >
          <span css={[cornerStyles.curve, cornerStyles.curveBlockStart]} />
        </span>
      )}
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
            chrome={chrome}
            endChromeCss={endChromeCss}
            top={top}
            body={body}
          />
        ))}
      </div>
      {cornersCss == null ? null : (
        <span
          aria-hidden
          css={[cornerStyles.anchor, cornerStyles.blockEnd, cornersCss]}
        >
          <span css={[cornerStyles.curve, cornerStyles.curveBlockEnd]} />
        </span>
      )}
      {column === "sidebar" ? null : (
        <span data-split-view-edge="" aria-hidden css={columnStyles.edge} />
      )}
    </>
  );
  return (
    <Landmark
      ref={sticks ? ref : undefined}
      aria-label={label}
      tabIndex={-1}
      inert={isLeaving}
      data-split-view-column={column}
      data-split-view-sidebar={column === "sidebar" ? "" : undefined}
      data-split-view-nav={carriesNav}
      {...stylex.props(
        columnStyles.column,
        a11y.focusRingInset,
        css,
        sticks && stickyCss,
        awayCss,
      )}
    >
      {sticks ? <EffectCarrier value={sticky}>{parts}</EffectCarrier> : parts}
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
  chrome,
  endChromeCss,
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
  chrome?: { start: ReactNode; end: ReactNode };
  endChromeCss?: StyleProp;
  top?: (page: ColumnPage) => ReactNode;
  body?: (page: ColumnPage) => ReactNode;
}) {
  const [box, setBox] = useState<HTMLElement | null>(null);
  const scroller = pageScrolls ? undefined : box;
  const isCurrent = page.role === "current";
  const scrollStyles =
    pageScroll === "never"
      ? null
      : pageScroll === "always"
        ? pageScrollStyles
        : stackedPageScrollStyles;
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
        {chrome === undefined ? (
          <RegionScroller
            scrollerRef={setBox}
            scrollerCss={[scrollStyles?.scroller, scrollerCss]}
            contentCss={[scrollStyles?.content, contentCss]}
          >
            {top?.(page)}
            {body === undefined ? page.column.node : body(page)}
            {accessory == null ? null : <Accessory>{accessory}</Accessory>}
          </RegionScroller>
        ) : (
          <ScrollMask
            ref={setBox}
            css={columnStyles.maskRoot}
            contentCss={[
              columnStyles.maskScroller,
              a11y.focusRingInset,
              scrollStyles?.scroller,
              scrollerCss,
            ]}
            startChrome={chrome.start}
            startDepth={space._8}
            startChromeCss={scrollStyles?.chrome}
            endChrome={chrome.end}
            endChromeCss={[scrollStyles?.chrome, endChromeCss]}
          >
            <div
              css={[columnStyles.content, scrollStyles?.content, contentCss]}
            >
              {top?.(page)}
              {body === undefined ? page.column.node : body(page)}
            </div>
          </ScrollMask>
        )}
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
