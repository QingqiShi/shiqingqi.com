"use client";

import type { AnimationEventHandler, ReactNode, RefObject } from "react";
import type { LeavingCopy } from "../leaving-copy-taker.tsx";
import { BackLink } from "./back-link.tsx";
import { columnStyles, contentStyles, stackStyles } from "./column.stylex.ts";
import { Column, type ColumnPage, type ColumnPageScroll } from "./column.tsx";
import { sidebarStyles } from "./sidebar.stylex.ts";
import { StackedOnly } from "./stacked-only.tsx";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewSidebar,
} from "./types.ts";
import { DEEP_DEPTH } from "./use-stack-opening.ts";

/**
 * What a page shows while it leaves, where the router cannot show its old
 * content: the skeleton it showed, or a copy of its DOM. A page that had just
 * started to wait is blank while stacked, where it opened over the sidebar.
 */
function LeavingBody({
  page,
  skeleton,
  copyRef,
}: {
  page: ColumnPage;
  skeleton: ReactNode;
  copyRef: RefObject<LeavingCopy | null>;
}) {
  if (page.leftAs === "skeleton") return skeleton;
  return (
    <div
      ref={(host) => {
        const copy = copyRef.current;
        if (host !== null && copy?.key === page.key) {
          copyRef.current = null;
          host.replaceChildren(copy.nodes);
          const scroller = host.closest(
            "[data-split-view-page]",
          )?.firstElementChild;
          if (scroller != null) scroller.scrollTop = copy.top;
        }
      }}
      css={[
        columnStyles.node,
        page.leftAs === "blank" && stackStyles.nodeHiddenWhileStacked,
      ]}
    />
  );
}

/** @internal */
export function ContentColumn({
  content,
  sidebar,
  as,
  pages,
  pageScrolls,
  pageScroll,
  isShown,
  close,
  stacks,
  showsStackRoot,
  depth,
  isRouted,
  skeleton,
  waiting,
  revealing,
  opensContent,
  onAnimationEnd,
  copyRef,
  onTakeOff,
}: {
  content: NavigationSplitViewColumn;
  sidebar: NavigationSplitViewSidebar | null | undefined;
  as: "main" | "section";
  pages: readonly ColumnPage[];
  pageScrolls: boolean;
  pageScroll: ColumnPageScroll;
  isShown: boolean;
  close: (() => void) | null;
  stacks: boolean;
  showsStackRoot: boolean;
  depth: number;
  isRouted: boolean;
  skeleton: ReactNode;
  waiting: boolean;
  revealing: boolean;
  opensContent: boolean;
  onAnimationEnd: AnimationEventHandler<HTMLDivElement>;
  copyRef: RefObject<LeavingCopy | null>;
  onTakeOff: (href: string) => void;
}) {
  return (
    <Column
      column="content"
      as={as}
      pageScrolls={pageScrolls}
      pageScroll={pageScroll}
      isShown={isShown}
      label={content.label}
      pages={pages}
      close={close}
      css={[
        contentStyles.base,
        sidebar?.stacked === "drawer" && contentStyles.onCanvas,
        stacks && stackStyles.contentColumn,
        showsStackRoot && [
          sidebarStyles.fullBesideContent,
          stackStyles.contentAtRoot,
        ],
      ]}
      pageCss={stacks && stackStyles.contentPage}
      scrollerCss={
        stacks
          ? content.back != null && stackStyles.swipes
          : content.back != null && contentStyles.swipes
      }
      contentCss={contentStyles.inPageColumn}
      top={(page) => {
        // The back link of a destination that still opens leads to
        // this URL, and this navigation ends the one that is pending.
        const back =
          page.column.back ??
          (stacks &&
          sidebar != null &&
          depth === DEEP_DEPTH &&
          page.role === "current"
            ? {
                href: window.location.pathname + window.location.search,
                label: sidebar.label,
              }
            : null);
        if (back === null) return null;
        const link = <BackLink back={back} onTakeOff={onTakeOff} />;
        return stacks ? <StackedOnly>{link}</StackedOnly> : link;
      }}
      body={
        !isRouted
          ? undefined
          : (page) =>
              page.role === "leaving" ? (
                <LeavingBody
                  page={page}
                  skeleton={skeleton}
                  copyRef={copyRef}
                />
              ) : (
                <>
                  {waiting ? skeleton : null}
                  <div
                    data-split-view-node=""
                    onAnimationEnd={onAnimationEnd}
                    css={[
                      columnStyles.node,
                      revealing && columnStyles.reveal,
                      stacks &&
                        opensContent &&
                        depth === DEEP_DEPTH &&
                        stackStyles.nodeHiddenWhileStacked,
                      waiting && columnStyles.nodeHidden,
                    ]}
                  >
                    {page.column.node}
                  </div>
                </>
              )
      }
    />
  );
}
