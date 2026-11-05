"use client";

import type { ReactNode } from "react";
import { SidebarDrawer } from "../sidebar-drawer.tsx";
import { stackStyles } from "./column.stylex.ts";
import { Column } from "./column.tsx";
import { sidebarStyles } from "./sidebar.stylex.ts";
import { SplitViewDustContext } from "./split-view-link.tsx";
import type { NavigationSplitViewSidebar } from "./types.ts";
import { SplitViewColumnContext } from "./use-split-view-column.ts";

/** Where the full or the collapsed sidebar shows, each a column of its own. */
function sidebarShownStyle(form: "full" | "collapsed", hasDetail: boolean) {
  if (hasDetail) {
    return form === "full"
      ? sidebarStyles.hidden
      : sidebarStyles.collapsedBesideDetail;
  }
  return form === "full"
    ? sidebarStyles.fullBesideContent
    : sidebarStyles.collapsedBesideContent;
}

/** @internal */
export function SidebarColumns({
  sidebar,
  collapsedSidebar,
  stacks,
  showsStackRoot,
  sidebarFits,
  fitsCollapsed,
  fitsFullSidebar,
  hasDetailColumn,
  folding,
  pageScrolls,
  canPageScroll,
}: {
  sidebar: NavigationSplitViewSidebar;
  collapsedSidebar: ReactNode;
  stacks: boolean;
  showsStackRoot: boolean;
  sidebarFits: boolean | null;
  fitsCollapsed: boolean | null;
  fitsFullSidebar: boolean | null;
  hasDetailColumn: boolean;
  folding: "fold" | "unfold" | null;
  pageScrolls: boolean;
  canPageScroll: boolean;
}) {
  const hasCollapsed = collapsedSidebar !== null;
  const sidebarForms: readonly ("full" | "collapsed")[] = hasCollapsed
    ? ["full", "collapsed"]
    : ["full"];
  const dustOf = (form: "full" | "collapsed") => {
    if (folding === null) return null;
    return (folding === "fold") === (form === "full") ? "shed" : "pull";
  };
  const isSidebarShown = (form: "full" | "collapsed") => {
    if (stacks) return showsStackRoot || fitsFullSidebar !== false;
    if (form === "full") return !hasDetailColumn && fitsFullSidebar !== false;
    return (
      hasDetailColumn || (fitsCollapsed !== false && fitsFullSidebar !== true)
    );
  };

  return sidebarForms.map((form) => (
    <SplitViewDustContext key={form} value={dustOf(form)}>
      <Column
        column="sidebar"
        form={form}
        pageScrolls={pageScrolls}
        canPageScroll={canPageScroll}
        isShown={isSidebarShown(form)}
        label={sidebar.label}
        presentation={stacks && sidebarFits !== true ? "page" : "column"}
        pages={[
          {
            key: sidebar.key ?? "",
            role: "current",
            stack: stacks ? (showsStackRoot ? "root" : "under") : undefined,
            column: {
              ...sidebar,
              node: form === "full" ? sidebar.node : collapsedSidebar,
            },
          },
        ]}
        close={null}
        css={[
          sidebarStyles.base,
          form === "full" ? sidebarStyles.full : sidebarStyles.collapsed,
          sidebarShownStyle(form, hasDetailColumn),
          stacks && stackStyles.sidebar,
          stacks &&
            (showsStackRoot
              ? stackStyles.sidebarRoot
              : [sidebarStyles.fullBesideContent, stackStyles.sidebarUnder]),
        ]}
        contentCss={[
          form === "full"
            ? sidebarStyles.fullContent
            : sidebarStyles.collapsedContent,
          stacks && stackStyles.sidebarContent,
        ]}
      />
    </SplitViewDustContext>
  ));
}

/** @internal */
export function DrawerColumn({
  drawer,
  fits,
  isOpen,
  onOpenChange,
  isContained,
  scroller,
  scrollerRef,
}: {
  drawer: Extract<NavigationSplitViewSidebar, { stacked: "drawer" }>;
  fits: boolean | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isContained: boolean;
  scroller: HTMLElement | null;
  scrollerRef: (scroller: HTMLElement | null) => void;
}) {
  return (
    <SplitViewColumnContext
      value={{
        column: "sidebar",
        presentation: "column",
        scroller,
        isShown: fits !== false || isOpen,
        close: null,
      }}
    >
      <SidebarDrawer
        label={drawer.label}
        menuLabel={drawer.menuLabel}
        closeLabel={drawer.closeLabel}
        header={drawer.header}
        footer={drawer.footer}
        fits={fits}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isContained={isContained}
        scrollerRef={scrollerRef}
      >
        {drawer.node}
      </SidebarDrawer>
    </SplitViewColumnContext>
  );
}
