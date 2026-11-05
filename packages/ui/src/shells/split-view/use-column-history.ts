import { useLayoutEffect, useRef } from "react";
import { isPlainClick } from "../../actions/use-tab-press.ts";
import { normalizeUrl } from "../normalize-url.ts";
import type { SplitViewState } from "./split-view-link.tsx";
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewDetail,
} from "./types.ts";

/**
 * The URL of the history entry before this one, where the browser tells it,
 * and else where a column link of the view pushed this entry.
 */
function previousEntryUrl(pushed: { from: string; to: string } | null) {
  if ("navigation" in window && window.navigation.currentEntry !== null) {
    const index = window.navigation.currentEntry.index;
    const url = index > 0 ? window.navigation.entries()[index - 1]?.url : null;
    return url == null ? null : normalizeUrl(url);
  }
  return pushed !== null && pushed.to === normalizeUrl(window.location.href)
    ? pushed.from
    : null;
}

/** @internal */
export function useColumnHistory({
  content,
  detail,
  deepestKey,
  deepestBackHref,
  isRouted,
  capture,
  replace,
  replaceWaiting,
}: {
  content: NavigationSplitViewColumn;
  detail: NavigationSplitViewDetail | null | undefined;
  deepestKey: string | null | undefined;
  deepestBackHref: string | undefined;
  isRouted: boolean;
  capture: (to: string, isHistoryStep?: boolean) => void;
  replace: (href: string) => void;
  replaceWaiting: (href: string) => void;
}) {
  const leavingRef = useRef<string | null>(null);
  const pushedRef = useRef<{ from: string; to: string } | null>(null);
  const pressedRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    leavingRef.current = null;
  }, [deepestKey, deepestBackHref]);

  const takeOff = (href: string) => {
    // The back link of a destination that still opens leads to this URL, and
    // this navigation ends the one that is pending.
    if (normalizeUrl(href) === normalizeUrl(window.location.href)) {
      replace(href);
      return;
    }
    if (leavingRef.current === window.location.href) return;
    leavingRef.current = window.location.href;
    capture(href);
    if (previousEntryUrl(pushedRef.current) === normalizeUrl(href)) {
      window.history.back();
    } else {
      replaceWaiting(href);
    }
  };

  const follow: SplitViewState["follow"] = (event, href, column) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    pressedRef.current = event.currentTarget;
    const target = normalizeUrl(href);
    if (target === normalizeUrl(window.location.href)) {
      // The router loads the page again on a link to the page that shows.
      if (!isRouted) event.preventDefault();
      return;
    }
    const backs = [content.back, detail?.back];
    if (
      backs.some((back) => back != null && normalizeUrl(back.href) === target)
    ) {
      event.preventDefault();
      takeOff(href);
      return;
    }
    const changesShownColumn =
      column === "sidebar"
        ? content.back != null
        : column === "content" && detail != null;
    capture(href);
    if (changesShownColumn) {
      event.preventDefault();
      replaceWaiting(href);
      return;
    }
    pushedRef.current = {
      from: normalizeUrl(window.location.href),
      to: target,
    };
  };

  return { takeOff, follow, pressedRef };
}
