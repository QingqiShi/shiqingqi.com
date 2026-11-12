"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import { useLinkSlot } from "../actions/link-provider.tsx";
import { NavViewContext } from "../actions/nav-list-context.tsx";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import { pageColumn } from "../primitives/page-column.stylex.ts";
import { islandSurface } from "../surfaces/island.stylex.ts";
import { useIsInSheetBoundary } from "../surfaces/sheet.tsx";
import { rhythm } from "../tokens.stylex.ts";
import { LeavingCopyTaker } from "./leaving-copy-taker.tsx";
import { splitViewQueries } from "./navigation-split-view-layout.stylex.ts";
import { SidebarToggle, useSidebarCollapsed } from "./sidebar-toggle.tsx";
import type { ColumnPage, ColumnPageScroll } from "./split-view/column.tsx";
import { ContentColumn } from "./split-view/content-column.tsx";
import { DetailColumn } from "./split-view/detail-column.tsx";
import { DetailSheet } from "./split-view/detail-sheet.tsx";
import { SidebarColumns } from "./split-view/sidebar-columns.tsx";
import {
  SplitViewContext,
  type SplitViewState,
} from "./split-view/split-view-link.tsx";
import type {
  NavigationSplitViewProps,
  SplitViewBackLink,
} from "./split-view/types.ts";
import { useColumnHistory } from "./split-view/use-column-history.ts";
import { useColumnKeys, useStackFocus } from "./split-view/use-column-keys.ts";
import { useColumnPages } from "./split-view/use-column-pages.ts";
import { useEdgeSwipe } from "./split-view/use-edge-swipe.ts";
import { SplitViewMarksContext } from "./split-view/use-split-view-shared.ts";
import { useStackHandoff } from "./split-view/use-stack-handoff.ts";
import { useStackOpening } from "./split-view/use-stack-opening.ts";
import { useViewMotion } from "./split-view/use-view-motion.ts";
import { useViewWidthsReached } from "./split-view/use-view-widths-reached.ts";
import {
  viewFramePageScrollStyles,
  viewFrameStyles,
} from "./split-view/view-frame.stylex.ts";
import type { SplitViewMarks } from "./split-view-motion/types.ts";
import { useIsInTabView } from "./tab-view.tsx";
import {
  useTabViewSidebarNav,
  type TabViewSidebarNav,
} from "./use-tab-view-sidebar-nav.ts";

export { SplitViewLink } from "./split-view/split-view-link.tsx";
export { StackedOnly, UnlessStacked } from "./split-view/stacked-only.tsx";
export type {
  NavigationSplitViewColumn,
  NavigationSplitViewDetail,
  NavigationSplitViewSidebar,
  SplitViewBackLink,
  SplitViewColumnState,
  SplitViewLinkProps,
} from "./split-view/types.ts";
export { useSplitViewColumn } from "./split-view/use-split-view-column.ts";
export {
  useSplitViewShared,
  type SplitViewSharedOptions,
} from "./split-view/use-split-view-shared.ts";

/**
 * A list, the content that a row of it opens, and the detail of what is
 * picked there, each in its own scroll box, as tall as the screen. The
 * consumer decides what is picked, normally from the URL, and passes the
 * columns that show it.
 *
 * The view fits the columns to the width it gets, not to the screen. From
 * 48rem, the list is the sidebar beside the content. Below that, the list
 * is the first page of a stack and fills the view: `sidebar.href` is its
 * URL, a row pushes the content in over it, and the `back` of the content
 * goes back to it. A URL whose content has a `back` thus opens on the
 * content, and one whose content has none opens on the list. The `back` of
 * the content shows only where the view is stacked.
 *
 * The screen has one sidebar. In a `TabView`, the sidebar of the view shows
 * the destinations of the `TabView` above the list, and the `TabView` shows
 * no sidebar of its own. Below 48rem the `TabView` keeps its destinations in
 * its rail of icons or its tab bar. Outside a `TabView`, the view paints the
 * sidebar fill itself, the sidebar takes a `header` and a `footer`, and with
 * a `toggleLabel` it has a button that collapses it. A collapsed sidebar
 * leaves the content alone, with the button at its top.
 *
 * Where the detail fits beside the content, it is a column, and else a sheet
 * over the content. In a `TabView` narrower than 72rem, the sidebar gives
 * way while the detail column shows, and the `TabView` shows its rail of
 * icons. Outside a `TabView`, the sidebar always gives way to the detail
 * column. A change of the composition keeps each column and its scroll.
 *
 * Where the view fills a screen narrower than 30rem, as on a phone, the page
 * scrolls the content instead of its scroll box, so that it goes under the
 * status bar of the browser, and each page of the content keeps its own
 * scroll. The view fills the screen unless it is in a `SheetBoundary`, and it
 * then always scrolls its columns. Outside a `TabView` and a `SheetBoundary`,
 * the content column is the `<main>` landmark, and a key that scrolls, while
 * nothing has focus, scrolls the content, as it would the page.
 *
 * For a screen with no list, use `NavigationStack`.
 *
 * The content sits in the page column, centred in the content column, and a
 * named width such as `pageColumn.settings` in `css` sets its width. Without
 * one, it spans its column. The detail and the sidebar always span their
 * columns.
 *
 * History: a column link (`SplitViewLink`) that opens a column deeper than
 * those that show pushes an entry. One that changes what a column already
 * shows replaces the entry, so that Back still takes off one column at a
 * time. Taking a column off — its back link, the close button, Esc, ← or a
 * dismissed sheet — goes back one entry where that entry is the column
 * under it, and else replaces the entry with the `back` URL, such as after
 * a reload. Thus no take-off leaves an entry that Back must step through.
 * Beside the sidebar, a change of the content is a cross-fade, and Esc and ←
 * leave the content where it is.
 *
 * With a `linkStatus`, a `NavLink` or a `ListRow` marks its link at once, a
 * stacked view opens the destination at once, and if the screen takes more than
 * a moment, the content column shows `skeleton` while the old content stays
 * mounted, hidden, and the new content then fades in. With Next, pass it with the
 * matching `Link` as `linkComponent`. It also says that the router owns the
 * content: `content.node` shows the page of the current URL, whatever its key. So
 * the view keeps no page of it under the new one, and a page that leaves shows a
 * copy of its DOM, with no ids and out of reach of focus. With `null`, the view
 * keeps the real pages. A detail needs `null`, as its column keeps the real page
 * that leaves, and a page that the router owns would show the new URL as it goes.
 *
 * Keys, unless focus is in a field, a sheet or a dialog: Esc and ← take the
 * deepest column off. J and K move focus to the next and the previous
 * column link in the column that has focus, and Enter and → follow it. A view in
 * a `SheetBoundary` takes keys only while focus is in it.
 *
 * Motion follows the URL, after the first paint. A deeper column page
 * springs in over the page it leaves, which drifts back and dims, and a
 * shallower one springs back out. A detail slides in beside the content,
 * and the Shared elements (`useSplitViewShared`)
 * fly between their forms. What the content shows moves to its new place
 * in the narrower or wider column: a box that keeps its size moves as one,
 * the boxes in a box that changes its size move by the same rule, and text
 * that wraps again changes at once. A detail in a sheet grows out of the
 * link in the content that opens it, a column link or a plain one, and
 * shrinks back into it. Where the content is stacked, a drag from the
 * start edge of the content takes it off. A navigation in the middle of a
 * motion starts from where the motion is. Under reduced motion, each change
 * is a short cross-fade. The Shared elements fly only for a navigation that
 * the view starts, such as from a column link or a back link, and for Back
 * and Forward of the browser. Another navigation, such as a `router.push`
 * after a form, moves the columns, the pages and the boxes of the content
 * only.
 */
export function NavigationSplitView({
  sidebar,
  content,
  detail,
  linkComponent: ownLinkComponent,
  linkStatus,
  skeleton,
  replace = replaceLocation,
  css,
}: NavigationSplitViewProps) {
  const linkComponent = useLinkSlot(ownLinkComponent);
  const [view, setView] = useState<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [marks] = useState<SplitViewMarks>(() => new Map());
  const widthsReached = useViewWidthsReached(view);
  const fitsFullSidebar = widthsReached === null ? null : widthsReached >= 2;
  const detailBeside = widthsReached === null ? null : widthsReached >= 3;
  const isRouted = linkStatus !== null;
  const hasSidebar = sidebar != null;
  const isInTabView = useIsInTabView();
  const tabViewNav = useTabViewSidebarNav();
  const isOwnCollapsed = useSidebarCollapsed(sidebar?.defaultCollapsed);
  const ownToggle =
    tabViewNav === null && sidebar?.toggleLabel !== undefined ? (
      <SidebarToggle
        label={sidebar.toggleLabel}
        css={ownSidebarStyles.toggle}
      />
    ) : null;
  const ownNav: TabViewSidebarNav | null =
    tabViewNav !== null || sidebar == null
      ? null
      : {
          isCollapsed: ownToggle !== null && isOwnCollapsed,
          top:
            sidebar.header == null && ownToggle === null ? null : (
              <div css={ownSidebarStyles.top}>
                <div css={ownSidebarStyles.header}>{sidebar.header}</div>
                {ownToggle}
              </div>
            ),
          bottom:
            sidebar.footer == null ? null : (
              <div css={ownSidebarStyles.bottom}>{sidebar.footer}</div>
            ),
        };
  const sidebarNav = tabViewNav ?? ownNav;
  const isContained = useIsInSheetBoundary();
  const fillsScreen = !isInTabView && !isContained;
  const pageScroll: ColumnPageScroll = isContained ? "never" : "narrow";
  const isPageSidebar = fitsFullSidebar === false;
  const asSheet = detail != null && detailBeside === false;
  const detailColumn = asSheet ? null : (detail ?? null);
  const hasDetailColumn = detailColumn !== null;
  const deepest = detail ?? content;
  const deepestBack = deepest.back ?? null;
  const {
    opening,
    setOpening,
    tabOpening,
    opensStackRoot,
    opensContent,
    waiting,
    revealing,
    onAnimationEnd,
    replaceWaiting,
    isAtStackRoot,
    depth,
    showsStackRoot,
    wasDepth,
    depthChange,
  } = useStackOpening({ sidebar, content, linkStatus, replace });
  const { motion, setSettled, pages, details, goneDetail, enter } =
    useColumnPages({
      content,
      detail,
      detailColumn,
      isRouted,
      hasSidebar,
      waiting,
      opensContent,
      tabOpening,
      wasDepth,
      depth,
      depthChange,
    });
  const { motionRef, pageScrollRef, leavingCopyRef, capture, pageScrolls } =
    useViewMotion({
      view,
      layer,
      marks,
      motion,
      setSettled,
      showsStackRoot,
      contentKey: content.key,
      isRouted,
      opensContent,
      opensStackRoot,
      tabOpening,
    });
  const { takeOff, follow, pressedRef } = useColumnHistory({
    content,
    detail,
    deepestKey: deepest.key,
    deepestBackHref: deepestBack?.href,
    isRouted,
    capture,
    replace,
    replaceWaiting,
  });

  useStackFocus(
    view,
    hasDetailColumn ? "detail" : showsStackRoot ? "sidebar" : "content",
    (hasDetailColumn ? detailColumn.key : content.key) ?? null,
  );
  useColumnKeys(
    view,
    // Beside the content, the sidebar that a `back` leads to already shows.
    isPageSidebar || !hasSidebar || detail != null ? deepestBack : null,
    takeOff,
    isContained,
  );
  const swipedAtRef = useRef(Number.NEGATIVE_INFINITY);
  useEdgeSwipe(view, motionRef, pageScrollRef, content.back ?? null, (href) => {
    swipedAtRef.current = performance.now();
    takeOff(href);
  });
  useStackHandoff({
    view,
    isStackScreen: !hasSidebar && detail == null,
    content,
    copyRef: leavingCopyRef,
    swipedAtRef,
    enter,
  });

  const viewState: SplitViewState = {
    linkComponent,
    linkStatus,
    setOpening,
    follow,
  };
  const closeOf = (back: SplitViewBackLink | null | undefined) =>
    back == null
      ? null
      : () => {
          takeOff(back.href);
        };

  const contentPages: ColumnPage[] = [
    ...(pages.under === null
      ? []
      : [{ ...pages.under, role: "under" as const }]),
    { key: content.key ?? "", column: content, role: "current" },
    ...(pages.leaving === null
      ? []
      : [{ ...pages.leaving, role: "leaving" as const }]),
  ];
  const shownDetail = detailColumn ?? goneDetail?.column ?? null;
  const detailPages: ColumnPage[] =
    shownDetail === null
      ? []
      : [
          { key: shownDetail.key ?? "", column: shownDetail, role: "current" },
          ...(details?.leaving == null
            ? []
            : [{ ...details.leaving, role: "leaving" as const }]),
        ];

  const leavingPage = pages.leaving;
  const leavingCopyKey =
    leavingPage === null ||
    leavingPage.leftAs === "skeleton" ||
    (leavingPage.leftAs === "blank" && fitsFullSidebar === false)
      ? null
      : leavingPage.key;

  const shown = (
    <SplitViewContext value={viewState}>
      <NavViewContext
        value={{ pendingHref: opening, isPage: isPageSidebar && hasSidebar }}
      >
        <SplitViewMarksContext value={marks}>
          <div
            ref={setView}
            data-split-view=""
            css={[
              viewFrameStyles.view,
              !isContained && viewFramePageScrollStyles.view,
              movingMarker,
              hasSidebar && pageColumn.wide,
              ownNav !== null && viewFrameStyles.canvas,
              css,
            ]}
          >
            {isRouted ? (
              <LeavingCopyTaker
                view={view}
                pageKey={content.key ?? ""}
                copyKey={leavingCopyKey}
                copyRef={leavingCopyRef}
              />
            ) : null}
            <div
              css={[
                islandSurface.frame,
                viewFrameStyles.columns,
                !isContained && viewFramePageScrollStyles.columns,
                !isInTabView && viewFrameStyles.columnsWithoutBar,
                fillsScreen && viewFrameStyles.columnsOnScreen,
                fillsScreen &&
                  !hasSidebar &&
                  detail == null &&
                  viewFrameStyles.columnsAlone,
                hasSidebar &&
                  !hasDetailColumn &&
                  viewFrameStyles.stackedBelowSidebar,
              ]}
            >
              {hasSidebar ? (
                <SidebarColumns
                  sidebar={sidebar}
                  nav={sidebarNav}
                  showsStackRoot={showsStackRoot}
                  fitsFullSidebar={fitsFullSidebar}
                  hasDetailColumn={hasDetailColumn}
                  isInTabView={isInTabView}
                  pageScrolls={pageScrolls}
                  pageScroll={pageScroll}
                />
              ) : null}
              <ContentColumn
                content={content}
                sidebar={sidebar}
                as={fillsScreen ? "main" : "section"}
                pages={contentPages}
                pageScrolls={pageScrolls}
                pageScroll={pageScroll}
                isShown={!isAtStackRoot || fitsFullSidebar !== false}
                close={closeOf(content.back)}
                expand={ownNav?.isCollapsed === true ? ownToggle : null}
                hasSidebar={hasSidebar}
                showsStackRoot={showsStackRoot}
                depth={depth}
                isRouted={isRouted}
                skeleton={skeleton}
                waiting={waiting}
                revealing={revealing}
                opensContent={opensContent}
                onAnimationEnd={onAnimationEnd}
                copyRef={leavingCopyRef}
                onTakeOff={takeOff}
              />
              {shownDetail === null ? null : (
                <DetailColumn
                  detail={shownDetail}
                  pages={detailPages}
                  pageScrolls={pageScrolls}
                  pageScroll={pageScroll}
                  isLeaving={detailColumn === null}
                  close={
                    detailColumn === null ? null : closeOf(shownDetail.back)
                  }
                  onTakeOff={takeOff}
                />
              )}
            </div>
            <div
              ref={setLayer}
              aria-hidden
              inert
              css={viewFrameStyles.flights}
            />
          </div>
          <DetailSheet
            detail={asSheet ? detail : null}
            view={view}
            pressedRef={pressedRef}
            onTakeOff={takeOff}
          />
        </SplitViewMarksContext>
      </NavViewContext>
    </SplitViewContext>
  );
  return fillsScreen ? <div css={viewFrameStyles.screen}>{shown}</div> : shown;
}

const ownSidebarStyles = stylex.create({
  // The `header` and, at its end, the button that collapses the sidebar.
  top: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    minInlineSize: 0,
    marginBlockEnd: rhythm.item,
  },
  header: {
    minInlineSize: 0,
  },
  // The button shows only where the sidebar shows beside the content.
  toggle: {
    display: {
      default: "none",
      [splitViewQueries.contentBesideSidebar]: "inline-flex",
    },
  },
  bottom: {
    marginBlockStart: "auto",
    paddingBlockStart: rhythm.item,
  },
});

function replaceLocation(href: string) {
  window.location.replace(href);
}
