"use client";

import type { TabViewSidebarNav } from "../use-tab-view-sidebar-nav.ts";
import { stackStyles } from "./column.stylex.ts";
import { Column, type ColumnPageScroll } from "./column.tsx";
import { sidebarStyles } from "./sidebar.stylex.ts";
import type { NavigationSplitViewSidebar } from "./types.ts";

/**
 * The list of a view. Beside the content it is the sidebar: it lies on the
 * canvas, and it draws `nav` around its node. Where it does not fit there, it
 * is the first page of the stack, an island as the content is.
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
  return (
    <Column
      column="sidebar"
      carriesNav={
        carriesNav ? (hasDetailColumn ? "wide" : "always") : undefined
      }
      header={
        carriesNav ? (
          <div
            css={[
              stackStyles.sidebarHeader,
              nav.top != null && stackStyles.sidebarHeaderRule,
              ownsHeader && stackStyles.sidebarHeaderOnPage,
            ]}
          >
            {nav.top}
          </div>
        ) : undefined
      }
      footer={
        carriesNav && nav.bottom !== null ? (
          <div css={stackStyles.sidebarFooter}>{nav.bottom}</div>
        ) : undefined
      }
      pageScrolls={pageScrolls}
      pageScroll={pageScroll}
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
      ]}
      scrollerCss={stackStyles.sidebarScroller}
      contentCss={[
        sidebarStyles.fullContent,
        stackStyles.sidebarContent,
        ownsHeader && stackStyles.sidebarContentUnderHeader,
      ]}
      awayCss={[
        staysBesideDetail && sidebarStyles.awayBesideDetail,
        hasDetailColumn && !isInTabView && sidebarStyles.awayBesideDetailAlways,
        isCollapsed && sidebarStyles.awayWhileCollapsed,
      ]}
    />
  );
}
