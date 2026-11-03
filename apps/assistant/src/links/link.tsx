"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";

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

function followsToSamePage(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    event.currentTarget.href === window.location.href
  );
}

/**
 * `next/link` that never prefetches on its own: not in view, and not on hover
 * or focus unless `prefetchOnIntent` is set. A link to the page that shows loads
 * it again, as in a browser, which a page in the router's cache does not do.
 */
export function Link({
  prefetchOnIntent = false,
  onPointerEnter,
  onFocus,
  onClick,
  ...props
}: LinkProps) {
  const router = useRouter();
  const [intent, setIntent] = useState(false);
  const showIntent = () => {
    if (prefetchOnIntent) setIntent(true);
  };
  return (
    <NextLink
      {...props}
      prefetch={intent}
      onClick={(event) => {
        onClick?.(event);
        if (!followsToSamePage(event)) return;
        // next/link navigates after this handler, and a navigation discards a
        // refresh that is in progress, so the refresh must start after it.
        queueMicrotask(() => {
          router.refresh();
        });
      }}
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
