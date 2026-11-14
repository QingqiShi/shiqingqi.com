"use client";

import * as stylex from "@stylexjs/stylex";
import {
  use,
  useEffect,
  useState,
  type AnimationEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import type { LeavingCopy } from "../leaving-copy-taker.tsx";
import { BackLink } from "./back-link.tsx";
import {
  columnStyles,
  contentStyles,
  cornerStyles,
  stackStyles,
} from "./column.stylex.ts";
import { Column, type ColumnPage, type ColumnPageScroll } from "./column.tsx";
import { sidebarStyles } from "./sidebar.stylex.ts";
import { StackedOnly } from "./stacked-only.tsx";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewSidebar,
} from "./types.ts";
import { SplitViewColumnContext } from "./use-split-view-column.ts";
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
 * Tells whether the content has scrolled from its top, where the button of a
 * collapsed sidebar is over it.
 */
function UnderToggleWatch({
  onChange,
}: {
  onChange: (isUnder: boolean) => void;
}) {
  const scroller = use(SplitViewColumnContext)?.scroller ?? null;
  const [box, setBox] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (box === null) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onChange(!entry.isIntersecting);
      },
      { root: scroller },
    );
    observer.observe(box);
    return () => {
      observer.disconnect();
      onChange(false);
    };
  }, [box, scroller, onChange]);
  return <div ref={setBox} aria-hidden css={watchStyles.box} />;
}

// At the top of the content, so that it leaves the scrollport as soon as the
// content scrolls.
const watchStyles = stylex.create({
  box: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineStart: 0,
    inlineSize: "1px",
    blockSize: "1px",
    pointerEvents: "none",
    visibility: "hidden",
  },
});

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
  onUnderToggle,
  hasSidebar,
  besideFill,
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
  /**
   * While the button of a collapsed sidebar is over the top of the content:
   * takes whether the content has scrolled under it.
   */
  onUnderToggle: ((isUnder: boolean) => void) | null;
  hasSidebar: boolean;
  /** What has the sidebar fill beside the content: the rail or the sidebar of a `TabView`, the sidebar of the view, or nothing. */
  besideFill: "rail" | "sidebar" | null;
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
      cornersCss={
        besideFill === "rail"
          ? cornerStyles.besideRail
          : besideFill === "sidebar"
            ? cornerStyles.besideSidebar
            : undefined
      }
      pageCss={hasSidebar && stackStyles.contentPage}
      scrollerCss={
        hasSidebar
          ? content.back != null && stackStyles.swipes
          : content.back != null && contentStyles.swipes
      }
      contentCss={
        content.flush === true
          ? contentStyles.flush
          : [
              contentStyles.inPageColumn,
              onUnderToggle !== null && contentStyles.underToggle,
            ]
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
            {onUnderToggle === null || page.role !== "current" ? null : (
              <UnderToggleWatch onChange={onUnderToggle} />
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
