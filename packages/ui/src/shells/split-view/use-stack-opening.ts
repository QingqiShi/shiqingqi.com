import {
  useOptimistic,
  useState,
  useTransition,
  type ComponentType,
} from "react";
import { normalizeUrl } from "../normalize-url.ts";
import { useTabViewOpening } from "../tab-view.tsx";
import {
  useOpeningScreen,
  useReveal,
  type TabLinkStatusProps,
} from "../use-opening-screen.tsx";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewSidebar,
} from "./types.ts";

/**
 * How deep each screen of a stack is, so that a change of it pushes or pops:
 * a URL with no sidebar is 0, the sidebar as a page, and the content over it.
 *
 * @internal
 */
export const STACK_ROOT_DEPTH = 1;
/** @internal */
export const DEEP_DEPTH = 2;

/** @internal */
export function useStackOpening({
  stacks,
  sidebar,
  content,
  linkStatus,
  replace,
}: {
  stacks: boolean;
  sidebar: NavigationSplitViewSidebar | null | undefined;
  content: NavigationSplitViewColumn;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  replace: (href: string) => void;
}) {
  // A navigation that the view replaces the history entry with goes through
  // `replace`, not through a link, so no link can tell that it is pending.
  const [replacing, setReplacing] = useOptimistic<string | null>(null);
  const [, startReplacing] = useTransition();
  const { opening, setOpening, skeletonHref } = useOpeningScreen(replacing);
  const tabOpening = useTabViewOpening();
  const opensStackRoot =
    stacks &&
    opening !== null &&
    sidebar?.href !== undefined &&
    normalizeUrl(opening) === normalizeUrl(sidebar.href);
  const opensContent = opening !== null && !opensStackRoot;
  const waiting = skeletonHref !== null && !opensStackRoot;
  const { revealing, onAnimationEnd } = useReveal(waiting);
  const replaceWaiting = (href: string) => {
    if (linkStatus === null) {
      replace(href);
      return;
    }
    startReplacing(() => {
      setReplacing(href);
      replace(href);
    });
  };
  // Pending decides which page of the stack shows, so that the stack answers
  // at once. A destination that opens deeper than a URL with no sidebar waits
  // in place, as the page that shows there still has the content of that URL.
  const isAtStackRoot =
    stacks && sidebar?.stacked === "page" && content.back == null;
  const depth = opensStackRoot
    ? STACK_ROOT_DEPTH
    : isAtStackRoot
      ? opensContent
        ? DEEP_DEPTH
        : STACK_ROOT_DEPTH
      : content.back != null
        ? DEEP_DEPTH
        : 0;
  const showsStackRoot = stacks && depth === STACK_ROOT_DEPTH;
  const [wasDepth, setWasDepth] = useState(depth);
  if (wasDepth !== depth) setWasDepth(depth);
  const depthChange: "push" | "pop" | null =
    wasDepth === depth ? null : depth > wasDepth ? "push" : "pop";
  return {
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
  };
}
