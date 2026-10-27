"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Link } from "#src/links/link.tsx";

/**
 * The URL of `href` when it only changes the query of the screen that
 * shows, or null when it opens another screen.
 */
function sameScreenUrl(href: string) {
  const url = new URL(href, window.location.href);
  return url.origin === window.location.origin &&
    url.pathname === window.location.pathname
    ? url.href
    : null;
}

function pushEntry(url: string) {
  window.history.pushState(null, "", url);
}

/**
 * The link of a `NavigationSplitView`: it opens a column, or goes back to
 * one. It keeps the page and the other columns where they are, because it
 * does not scroll to the top. A link that only changes the query of the
 * screen changes the URL in the browser, with no request to the server,
 * because the Finance screens draw their columns from the Replica.
 */
export function ColumnLink({
  push = pushEntry,
  ...props
}: ComponentProps<"a"> & {
  href: string;
  /** Pushes the URL of a link that only changes the query. */
  push?: (url: string) => void;
}) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        const url = sameScreenUrl(props.href);
        if (url === null) return;
        event.preventDefault();
        push(url);
      }}
    />
  );
}

/** The `replace` of a `NavigationSplitView`, with no scroll, and in the browser alone where only the query changes. */
export function useColumnReplace() {
  const router = useRouter();
  return (href: string) => {
    const url = sameScreenUrl(href);
    if (url === null) router.replace(href, { scroll: false });
    else window.history.replaceState(null, "", url);
  };
}
