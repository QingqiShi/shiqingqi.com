"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Link } from "#src/links/link.tsx";
import { writeInBrowser } from "./finance-navigator.ts";

/**
 * The link of a `NavigationSplitView`: it opens a column, or goes back to
 * one. It keeps the page and the other columns where they are, because it
 * does not scroll to the top. A link that only changes the query of the
 * screen writes the history in the browser, the way `FinanceNavigator`
 * does.
 */
export function ColumnLink({
  opens = false,
  ...props
}: ComponentProps<"a"> & {
  href: string;
  /** The entry it adds is one that a close goes back from, as `FinanceNavigator.open` adds. */
  opens?: boolean;
}) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={(event) => {
        if (writeInBrowser(props.href, opens ? "open" : "push")) {
          event.preventDefault();
        }
      }}
    />
  );
}

/** The `replace` of a `NavigationSplitView`, with no scroll. An entry that a close goes back from stays one. */
export function useColumnReplace() {
  const router = useRouter();
  return (href: string) => {
    if (!writeInBrowser(href, "replace")) {
      router.replace(href, { scroll: false });
    }
  };
}

/** The `open` of a `NavigationSplitView`, with no scroll. It adds an entry that a close goes back from. */
export function useColumnOpen() {
  const router = useRouter();
  return (href: string) => {
    if (!writeInBrowser(href, "open")) {
      router.push(href, { scroll: false });
    }
  };
}
