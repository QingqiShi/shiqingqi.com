import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

let shownPath: string | null = null;
let pathBefore: string | null = null;

function pathnameOf(path: string) {
  return new URL(path, "http://localhost").pathname;
}

/**
 * Keeps the page that showed before this one, with its query, for
 * `useCameFrom`: Home's views differ only by their query. The frame of every
 * page renders it once, in a Suspense boundary, as search params need one.
 */
export function RecordShownPath() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    if (path === shownPath) return;
    pathBefore = shownPath;
    shownPath = path;
  }, [pathname, search]);
  return null;
}

/**
 * The path and query of the page that the owner opened this page from in the
 * app, as they first see this page; null after a load from outside, such as a
 * link in a notification or a page opened from the home screen.
 */
export function useCameFrom(): string | null {
  const pathname = usePathname();
  const [cameFrom] = useState(() => {
    // The frame records a page after its first render, so the page that a
    // render of a new page finds there can still be the page before it.
    if (shownPath === null) return null;
    return pathnameOf(shownPath) === pathname ? pathBefore : shownPath;
  });
  return cameFrom;
}
