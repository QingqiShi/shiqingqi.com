import { useState } from "react";
import {
  followPage,
  replacePage,
  settlePages,
  type SplitViewPage,
  type SplitViewPages,
} from "../follow-page.ts";
import type { SplitViewChange } from "../split-view-motion/types.ts";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewDetail,
} from "./types.ts";
import { DEEP_DEPTH, STACK_ROOT_DEPTH } from "./use-stack-opening.ts";

function pageOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column, motion: number): SplitViewPage<Column> {
  return { key: column.key ?? "", column, deep: column.back != null, motion };
}

function pagesOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column): SplitViewPages<Column> {
  return { under: null, current: pageOf(column, 0), leaving: null };
}

/** @internal */
export function useColumnPages({
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
}: {
  content: NavigationSplitViewColumn;
  detail: NavigationSplitViewDetail | null | undefined;
  detailColumn: NavigationSplitViewDetail | null;
  isRouted: boolean;
  stacks: boolean;
  waiting: boolean;
  opensContent: boolean;
  tabOpening: string | null;
  wasDepth: number;
  depth: number;
  depthChange: "push" | "pop" | null;
}) {
  // Each column keeps the pages that a motion still shows, and a change of
  // the URL is a motion of the next number.
  const [motion, setMotion] = useState<{ id: number; change: SplitViewChange }>(
    { id: 0, change: { content: null, stackRoot: null, detail: null } },
  );
  const [settled, setSettled] = useState(0);
  const nextMotion = motion.id + 1;
  const [pages, setPages] = useState<SplitViewPages<NavigationSplitViewColumn>>(
    () => pagesOf(content),
  );
  const [details, setDetails] =
    useState<SplitViewPages<NavigationSplitViewDetail> | null>(() =>
      detailColumn === null ? null : pagesOf(detailColumn),
    );
  const [goneDetail, setGoneDetail] =
    useState<SplitViewPage<NavigationSplitViewDetail> | null>(null);

  let nextPages = pages;
  let contentChange: SplitViewChange["content"] = null;
  if (pages.current.key !== (content.key ?? "")) {
    const next = pageOf(content, nextMotion);
    if (isRouted) {
      const leftAs = waiting
        ? "skeleton"
        : opensContent && wasDepth === DEEP_DEPTH
          ? "blank"
          : undefined;
      nextPages = replacePage(pages, next, leftAs);
      contentChange = depthChange ?? "swap";
    } else {
      const followed = followPage(pages, next);
      nextPages = followed.pages;
      contentChange = followed.change;
    }
  } else if (pages.current.column !== content) {
    nextPages = { ...pages, current: pageOf(content, 0) };
  }
  if (isRouted && contentChange === null) {
    contentChange = depthChange;
  }
  // A tab rises into place, or fades in over its skeleton. A skeleton that shows
  // already takes the place of the page that a push would cover.
  if (isRouted && contentChange !== null) {
    if (tabOpening !== null) {
      nextPages = { ...nextPages, leaving: null };
      contentChange = "swap";
    } else if (waiting && contentChange === "push") {
      contentChange = "swap";
    }
  }
  nextPages = settlePages(nextPages, settled);
  if (nextPages !== pages) setPages(nextPages);
  const stackRootPart: SplitViewChange["stackRoot"] =
    !stacks || contentChange === "swap" || wasDepth === depth
      ? null
      : Math.min(wasDepth, depth) === STACK_ROOT_DEPTH
        ? "back"
        : Math.max(wasDepth, depth) === STACK_ROOT_DEPTH
          ? "front"
          : null;

  // A detail that moves out of the sheet, as when the view grows, is no
  // motion.
  const [hadDetail, setHadDetail] = useState(detail != null);
  if (hadDetail !== (detail != null)) setHadDetail(detail != null);
  let nextDetails = details;
  let nextGone = goneDetail;
  let detailChange: SplitViewChange["detail"] = null;
  if (detailColumn !== null) {
    if (details === null) {
      if (!hadDetail) detailChange = "in";
      nextDetails = pagesOf(detailColumn);
      nextGone = null;
    } else if (details.current.key !== (detailColumn.key ?? "")) {
      detailChange = "swap";
      nextDetails = followPage(details, pageOf(detailColumn, nextMotion)).pages;
    } else if (details.current.column !== detailColumn) {
      nextDetails = { ...details, current: pageOf(detailColumn, 0) };
    }
  } else if (details !== null) {
    nextDetails = null;
    // A detail that moves into the sheet goes at once.
    if (detail == null) {
      detailChange = "out";
      nextGone = { ...details.current, motion: nextMotion };
    }
  }
  if (nextDetails !== null) nextDetails = settlePages(nextDetails, settled);
  if (nextGone !== null && nextGone.motion <= settled) nextGone = null;
  if (nextDetails !== details) setDetails(nextDetails);
  if (nextGone !== goneDetail) setGoneDetail(nextGone);

  if (contentChange !== null || detailChange !== null) {
    setMotion({
      id: nextMotion,
      change: {
        content: contentChange,
        stackRoot: stackRootPart,
        detail: detailChange,
      },
    });
  }

  return { motion, setSettled, pages, details, goneDetail };
}
