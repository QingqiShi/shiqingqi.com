"use client";

import type { AnimationEventHandler, ReactNode, RefObject } from "react";
import { EffectCarrier } from "../../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../../effect-layer/use-effect-sticky.ts";
import { StuckContext } from "../../surfaces/sticky-control-group.tsx";
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
          if (copy.pageTop !== undefined && copy.pageTop > 0) {
            host.style.marginBlockStart = `${String(-copy.pageTop)}px`;
          }
        }
      }}
      css={[
        columnStyles.node,
        page.leftAs === "blank" && stackStyles.nodeHiddenWhileStacked,
      ]}
    />
  );
}

/**
 * The button that expands a collapsed sidebar. It stays at the top of the
 * column while the page scrolls under it, on a surface of its own.
 */
function ExpandBar({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, isStuck, css } = sticky;
  return (
    <StuckContext value={isStuck}>
      <div ref={ref} css={[columnStyles.expand, css]}>
        <EffectCarrier value={sticky}>{children}</EffectCarrier>
      </div>
    </StuckContext>
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
  expand,
  hasSidebar,
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
  /** The button that expands a collapsed sidebar, at the top of each page. */
  expand: ReactNode;
  hasSidebar: boolean;
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
        hasSidebar && stackStyles.contentColumn,
        showsStackRoot && [
          sidebarStyles.fullBesideContent,
          stackStyles.contentAtRoot,
        ],
      ]}
      pageCss={hasSidebar && stackStyles.contentPage}
      scrollerCss={
        hasSidebar
          ? content.back != null && stackStyles.swipes
          : content.back != null && contentStyles.swipes
      }
      contentCss={
        content.flush === true
          ? contentStyles.flush
          : contentStyles.inPageColumn
      }
      top={(page) => {
        // The DOM that another view left has its own top.
        if (page.leftAs === "copy") return null;
        // The back link of a destination that still opens leads to
        // this URL, and this navigation ends the one that is pending.
        const back =
          page.column.back ??
          (hasSidebar &&
          sidebar != null &&
          depth === DEEP_DEPTH &&
          page.role === "current"
            ? {
                href: window.location.pathname + window.location.search,
                label: sidebar.label,
              }
            : null);
        const isFlush = page.column.flush === true;
        const link =
          back === null ? null : (
            <BackLink back={back} floats={isFlush} onTakeOff={onTakeOff} />
          );
        const toolbar = page.column.toolbar ?? null;
        const shownLink =
          hasSidebar && link !== null ? (
            <StackedOnly>{link}</StackedOnly>
          ) : (
            link
          );
        return (
          <>
            {expand === null || page.role !== "current" ? null : (
              <ExpandBar>{expand}</ExpandBar>
            )}
            {toolbar === null && !isFlush ? (
              shownLink
            ) : toolbar === null && shownLink === null ? null : (
              <div
                css={[columnStyles.topLine, isFlush && columnStyles.topFloats]}
              >
                {shownLink}
                {toolbar === null ? null : (
                  <div css={columnStyles.toolbar}>{toolbar}</div>
                )}
              </div>
            )}
          </>
        );
      }}
      body={(page) =>
        page.role === "leaving" && (isRouted || page.leftAs === "copy") ? (
          <LeavingBody page={page} skeleton={skeleton} copyRef={copyRef} />
        ) : !isRouted ? (
          page.column.node
        ) : (
          <>
            {waiting ? skeleton : null}
            <div
              data-split-view-node=""
              onAnimationEnd={onAnimationEnd}
              css={[
                columnStyles.node,
                revealing && columnStyles.reveal,
                hasSidebar &&
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
