import { useState } from "react";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewSidebar,
} from "./types.ts";

/**
 * The content of a view beside the collapsed rail of a `TabView`. A press of
 * the button that collapses the sidebar keeps the content of the URL of the
 * list on the screen. That content gets a `back` to the list, which has the
 * same URL, so `leave` goes there with no navigation.
 *
 * @internal
 */
export function useKeptRootContent({
  sidebar,
  content,
  isStackedByRail,
  widthsReached,
}: {
  sidebar: NavigationSplitViewSidebar | null | undefined;
  content: NavigationSplitViewColumn;
  isStackedByRail: boolean;
  widthsReached: number | null;
}) {
  const [isLeft, setIsLeft] = useState(false);
  // Each time the view leaves that content, the content gets a new key, so
  // that it leaves as a page of the stack does.
  const [leftCount, setLeftCount] = useState(0);
  const staysLeft =
    isStackedByRail &&
    (content.back != null ||
      (isLeft && widthsReached !== null && widthsReached >= 2));
  if (staysLeft !== isLeft) setIsLeft(staysLeft);
  const kept =
    sidebar != null &&
    isStackedByRail &&
    content.back == null &&
    !isLeft &&
    (widthsReached === null || widthsReached >= 2)
      ? { href: sidebar.href, label: sidebar.label }
      : null;
  const rootContent =
    content.back == null && leftCount > 0
      ? { ...content, key: `${content.key ?? ""} ${String(leftCount)}` }
      : content;
  return {
    content: kept === null ? rootContent : { ...rootContent, back: kept },
    /** Leaves the kept content for the list, if `href` is its `back`. */
    leave: (href: string) => {
      if (kept === null || href !== kept.href) return false;
      setIsLeft(true);
      setLeftCount(leftCount + 1);
      return true;
    },
  };
}
