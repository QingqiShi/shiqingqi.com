"use client";

import { useState } from "react";
import { NavViewContext } from "../actions/nav-list-context.tsx";
import { PlainAnchor } from "../actions/tab-bar.tsx";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import { pageColumn } from "../primitives/page-column.stylex.ts";
import { islandSurface } from "../surfaces/island.stylex.ts";
import { useIsInSheetBoundary } from "../surfaces/sheet.tsx";
import { LeavingCopyTaker } from "./leaving-copy-taker.tsx";
import type { ColumnPage } from "./split-view/column.tsx";
import { ContentColumn } from "./split-view/content-column.tsx";
import { DetailColumn } from "./split-view/detail-column.tsx";
import { DetailSheet } from "./split-view/detail-sheet.tsx";
import { DrawerColumn, SidebarColumns } from "./split-view/sidebar-columns.tsx";
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
import { useStackOpening } from "./split-view/use-stack-opening.ts";
import { useViewMotion } from "./split-view/use-view-motion.ts";
import { useViewWidthsReached } from "./split-view/use-view-widths-reached.ts";
import {
  viewFramePageScrollStyles,
  viewFrameStyles,
} from "./split-view/view-frame.stylex.ts";
import type { SplitViewMarks } from "./split-view-motion/types.ts";
import { useIsInTabView } from "./tab-view.tsx";

export { SplitViewLink } from "./split-view/split-view-link.tsx";
export {
  StackedOnly,
  UnlessFullSidebar,
  UnlessStacked,
} from "./split-view/stacked-only.tsx";
export type {
  NavigationSplitViewColumn,
  NavigationSplitViewDetail,
  NavigationSplitViewSidebar,
  NavigationSplitViewSidebarWithoutPage,
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
 * Up to three columns side by side, each in its own scroll box, as tall as
 * the screen: a sidebar, the content, and the detail of what is picked. The
 * consumer decides what is picked, normally from the URL, and passes the
 * columns that show it.
 *
 * The view fits the columns to the width it gets, not to the screen. While
 * a detail shows beside the content, the sidebar folds to the collapsed
 * sidebar. Without one, the sidebar shows full where it fits, collapsed
 * where it does not, and not at all on a phone, where the content fills the
 * view. Where the detail does not fit beside the content, it shows in a
 * sheet over it. A change of the composition keeps each column and its
 * scroll. Where the view fills a screen narrower than 30rem, as on a phone, the
 * page scrolls the content instead of its scroll box, so that it goes under the
 * status bar of the browser, and each page of the content keeps its own
 * scroll. The view fills the screen unless it is in a `SheetBoundary`, and it
 * then always scrolls its columns. Outside a `TabView` and a `SheetBoundary`,
 * the content column is the `<main>` landmark, and a key that scrolls, while
 * nothing has focus, scrolls the content, as it would the page.
 *
 * Without a `sidebar`, the view is one pane, the layout of a screen with nothing
 * beside it: `<NavigationSplitView content={{ label, node, accessory }} />`.
 * Without a `detail` too, it needs no `linkStatus`.
 *
 * The content of every view sits in the page column, centred in the content
 * column, and a named width such as `pageColumn.settings` in `css` sets its
 * width. Without one, a view with a sidebar spans its column, and a view of one
 * pane takes the width of the page column around it. The detail and the sidebar
 * always span their columns.
 *
 * History: a column link (`SplitViewLink`) that opens a column deeper than
 * those that show pushes an entry. One that changes what a column already
 * shows replaces the entry, so that Back still takes off one column at a
 * time. Taking a column off — its back link, the close button, Esc, ← or a
 * dismissed sheet — goes back one entry where that entry is the column
 * under it, and else replaces the entry with the `back` URL, such as after
 * a reload. Thus no take-off leaves an entry that Back must step through.
 *
 * With `sidebar.stacked` set to `"page"`, the sidebar is the root page of a
 * stack, which needs a `linkStatus`, wherever it does not fit beside the content, and the `back` of the
 * content shows only there. Beside the sidebar, a change of the content is a
 * cross-fade, and the only way back is the history rule above. A view with
 * `linkStatus` can also have a URL that opens with no sidebar, and a page of
 * the stack is then deeper than that URL: from it, the sidebar or the content
 * pushes in, and each goes back out to it.
 *
 * With `sidebar.stacked` set to `"drawer"`, the sidebar opens as a drawer from a
 * menu button at the top-end corner wherever it does not fit beside the content:
 * focus stays in it, the page does not scroll, and Esc, the backdrop or a link in
 * it closes it. The view publishes the room of the button as
 * `headerControlsTokens`, for a first row to keep clear of it.
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
 * A stack needs a router, so where `linkStatus` is `null` the sidebar cannot be
 * `stacked: "page"`, which is what `NavigationSplitViewSidebarWithoutPage` says.
 *
 * Keys, unless focus is in a field, a sheet or a dialog: Esc and ← take the
 * deepest column off. J and K move focus to the next and the previous
 * column link in the column that has focus, and Enter and → follow it. A view in
 * a `SheetBoundary` takes keys only while focus is in it.
 *
 * Motion follows the URL, after the first paint. A deeper column page
 * springs in over the page it leaves, which drifts back and dims, and a
 * shallower one springs back out. A detail slides in beside the content
 * while the sidebar folds, and the Shared elements (`useSplitViewShared`)
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
 * after a form, moves the columns, the sidebar, the pages and the boxes of
 * the content only.
 */
export function NavigationSplitView({
  sidebar,
  content,
  detail,
  linkComponent = PlainAnchor,
  linkStatus = null,
  skeleton,
  replace = replaceLocation,
  css,
}: NavigationSplitViewProps) {
  const [view, setView] = useState<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [marks] = useState<SplitViewMarks>(() => new Map());
  const widthsReached = useViewWidthsReached(view);
  const fitsCollapsed = widthsReached === null ? null : widthsReached >= 1;
  const fitsFullSidebar = widthsReached === null ? null : widthsReached >= 2;
  const detailBeside = widthsReached === null ? null : widthsReached >= 3;
  const isRouted = linkStatus !== null;
  const hasSidebar = sidebar != null;
  const drawer = sidebar?.stacked === "drawer" ? sidebar : null;
  const collapsedSidebar =
    sidebar?.stacked === "hidden" ? (sidebar.collapsed ?? null) : null;
  const hasCollapsed = collapsedSidebar !== null;
  const stacks = isRouted && hasSidebar && drawer === null && !hasCollapsed;
  const sidebarFits =
    stacks || drawer !== null ? fitsFullSidebar : fitsCollapsed;
  const isInTabView = useIsInTabView();
  const isContained = useIsInSheetBoundary();
  const fillsScreen = !isInTabView && !isContained;
  const isPageSidebar = sidebarFits === false;
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
  } = useStackOpening({ stacks, sidebar, content, linkStatus, replace });
  const { motion, setSettled, pages, details, goneDetail } = useColumnPages({
    content,
    detail,
    detailColumn,
    isRouted,
    stacks,
    waiting,
    opensContent,
    tabOpening,
    wasDepth,
    depth,
    depthChange,
  });
  const {
    motionRef,
    pageScrollRef,
    leavingCopyRef,
    capture,
    folding,
    pageScrolls,
  } = useViewMotion({
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
  const [drawerScroller, setDrawerScroller] = useState<HTMLElement | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useColumnKeys(
    view,
    // Beside the content, the sidebar that a `back` leads to already shows.
    isPageSidebar || !stacks || detail != null ? deepestBack : null,
    takeOff,
    isContained,
  );
  useEdgeSwipe(view, motionRef, pageScrollRef, content.back ?? null, takeOff);

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
        value={{ pendingHref: opening, isPage: isPageSidebar && stacks }}
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
                drawer !== null && viewFrameStyles.columnsWithMenu,
                !hasDetailColumn &&
                  (hasCollapsed
                    ? viewFrameStyles.stackedBelowCollapsed
                    : hasSidebar && viewFrameStyles.stackedBelowSidebar),
                hasSidebar &&
                  !hasDetailColumn &&
                  viewFrameStyles.fullSidebarBesideContent,
              ]}
            >
              {drawer !== null ? (
                <DrawerColumn
                  drawer={drawer}
                  fits={sidebarFits}
                  isOpen={isDrawerOpen}
                  onOpenChange={setIsDrawerOpen}
                  isContained={isContained}
                  scroller={drawerScroller}
                  scrollerRef={setDrawerScroller}
                />
              ) : hasSidebar ? (
                <SidebarColumns
                  sidebar={sidebar}
                  collapsedSidebar={collapsedSidebar}
                  stacks={stacks}
                  showsStackRoot={showsStackRoot}
                  sidebarFits={sidebarFits}
                  fitsCollapsed={fitsCollapsed}
                  fitsFullSidebar={fitsFullSidebar}
                  hasDetailColumn={hasDetailColumn}
                  folding={folding}
                  pageScrolls={pageScrolls}
                  canPageScroll={!isContained}
                />
              ) : null}
              <ContentColumn
                content={content}
                sidebar={sidebar}
                as={fillsScreen ? "main" : "section"}
                pages={contentPages}
                pageScrolls={pageScrolls}
                canPageScroll={!isContained}
                isShown={!isAtStackRoot || fitsFullSidebar !== false}
                close={closeOf(content.back)}
                stacks={stacks}
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
                  canPageScroll={!isContained}
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

function replaceLocation(href: string) {
  window.location.replace(href);
}
