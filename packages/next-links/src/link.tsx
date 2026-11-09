"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";

/** Tells a view of `@tuja/ui` whether the navigation to the `Link` around it is pending. */
export function LinkStatus({
  children,
}: {
  children: (pending: boolean) => ReactNode;
}) {
  return children(useLinkStatus().pending);
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch"> & {
  /**
   * Prefetch the page once the visitor shows intent: a mouse or a pen enters
   * the link, or the keyboard moves focus to it. A tap does not prefetch,
   * because the click follows at once. For a few links that the visitor opens
   * often, such as an app's main destinations.
   */
  prefetchOnIntent?: boolean;
};

/** `next/link` that never prefetches on its own: not in view, and not on hover or focus unless `prefetchOnIntent` is set. */
export function Link({
  prefetchOnIntent = false,
  onPointerEnter,
  onFocus,
  ...props
}: LinkProps) {
  const [intent, setIntent] = useState(false);
  const showIntent = () => {
    if (prefetchOnIntent) setIntent(true);
  };
  return (
    <NextLink
      {...props}
      prefetch={intent}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") showIntent();
        onPointerEnter?.(event);
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) showIntent();
        onFocus?.(event);
      }}
    />
  );
}
