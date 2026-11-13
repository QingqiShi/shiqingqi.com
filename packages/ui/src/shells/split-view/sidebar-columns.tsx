"use client";

import type { TabViewSidebarNav } from "../use-tab-view-sidebar-nav.ts";
import { cornerStyles, stackStyles } from "./column.stylex.ts";
import { Column, type ColumnPageScroll } from "./column.tsx";
import { sidebarStyles } from "./sidebar.stylex.ts";
import type { NavigationSplitViewSidebar } from "./types.ts";

/**
 * The list of a view. Beside the content it is the sidebar: it has the sidebar
 * fill, and it draws `nav` around its node. Where it does not fit there, it
 * is the first page of the stack, with the fill of the content.
 *
 * @internal
 */
export function SidebarColumns({
  sidebar,
  nav,
  showsStackRoot,
  fitsFullSidebar,
  hasDetailColumn,
  isInTabView,
  pageScrolls,
  pageScroll,
  sticks,
}: {
  sidebar: NavigationSplitViewSidebar;
  /** What the sidebar draws around its node, and whether it is collapsed. */
  nav: TabViewSidebarNav | null;
  showsStackRoot: boolean;
  fitsFullSidebar: boolean | null;
  hasDetailColumn: boolean;
  isInTabView: boolean;
  pageScrolls: boolean;
  pageScroll: ColumnPageScroll;
  /** Whether the page scrolls the content, and the sidebar beside it stays on the screen. */
  sticks: boolean;
}) {
  const isCollapsed = nav !== null && nav.isCollapsed;
  // In a `TabView`, the list stays beside a detail where all of them fit, and
  // the rail of that view holds the destinations where they do not.
  const staysBesideDetail = hasDetailColumn && isInTabView;
  const carriesNav =
    nav !== null && !isCollapsed && (!hasDetailColumn || isInTabView);
  // Outside a `TabView`, the `header` is the sidebar's own, and it shows above
  // the list also where the list is a page.
  const ownsHeader = carriesNav && !isInTabView && nav.top != null;
  // The `footer` is the sidebar's own too, and it shows under the list also
  // where the list is a page: a phone has no other place for its controls.
  const ownsFooter = carriesNav && !isInTabView && nav.bottom !== null;
  return (
    <Column
      column="sidebar"
      carriesNav={
        carriesNav ? (hasDetailColumn ? "wide" : "always") : undefined
      }
      chrome={
        carriesNav
          ? {
              start: (
                <div
                  css={[
                    stackStyles.sidebarHeader,
                    ownsHeader && stackStyles.sidebarHeaderOnPage,
                    ownsHeader && stackStyles.sidebarGutters,
                  ]}
                >
                  {nav.top}
                </div>
              ),
              end:
                nav.bottom === null ? null : (
                  <div
                    css={[
                      stackStyles.sidebarFooter,
                      !isInTabView && stackStyles.sidebarFooterOwn,
                      ownsFooter && stackStyles.sidebarFooterOnPage,
                      ownsFooter && stackStyles.sidebarGutters,
                    ]}
                  >
                    {nav.bottom}
                  </div>
                ),
            }
          : undefined
      }
      pageScrolls={pageScrolls}
      pageScroll={pageScroll}
      sticks={sticks}
      isShown={showsStackRoot || fitsFullSidebar !== false}
      label={sidebar.label}
      presentation={fitsFullSidebar !== true ? "page" : "column"}
      pages={[
        {
          key: sidebar.key ?? "",
          role: "current",
          stack: showsStackRoot ? "root" : "under",
          column: sidebar,
        },
      ]}
      close={null}
      css={[
        sidebarStyles.base,
        sidebarStyles.full,
        hasDetailColumn && !staysBesideDetail
          ? sidebarStyles.hidden
          : sidebarStyles.fullBesideContent,
        sidebarStyles.onCanvas,
        stackStyles.sidebar,
        showsStackRoot
          ? stackStyles.sidebarRoot
          : [sidebarStyles.fullBesideContent, stackStyles.sidebarUnder],
        sticks &&
          (showsStackRoot
            ? sidebarStyles.sticksAtRoot
            : sidebarStyles.sticksUnder),
      ]}
      cornersCss={isInTabView ? cornerStyles.pageBesideRail : undefined}
      contentCss={[
        sidebarStyles.fullContent,
        stackStyles.sidebarContent,
        stackStyles.sidebarGutters,
        ownsHeader && stackStyles.sidebarContentUnderHeader,
        ownsFooter && stackStyles.sidebarContentAboveFooter,
      ]}
      awayCss={[
        staysBesideDetail && sidebarStyles.awayBesideDetail,
        hasDetailColumn && !isInTabView && sidebarStyles.awayBesideDetailAlways,
        isCollapsed && sidebarStyles.awayWhileCollapsed,
      ]}
    />
  );
}
