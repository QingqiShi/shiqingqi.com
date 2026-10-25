"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { Link } from "#src/links/link.tsx";

/**
 * The link of a `NavigationSplitView`: it opens a column, or goes back to
 * one. It keeps the page and the other columns where they are, because it
 * does not scroll to the top.
 */
export function ColumnLink(props: ComponentProps<"a"> & { href: string }) {
  return <Link {...props} scroll={false} />;
}

/** The `replace` of a `NavigationSplitView`, through the router and with no scroll. */
export function useColumnReplace() {
  const router = useRouter();
  return (href: string) => {
    router.replace(href, { scroll: false });
  };
}
