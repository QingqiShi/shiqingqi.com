"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "prefetch">;

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

/** `next/link` that never prefetches. A link to the page that shows loads it again, as in a browser, which a page in the router's cache does not do. */
export function Link({ onClick, ...props }: LinkProps) {
  const router = useRouter();
  return (
    <NextLink
      {...props}
      prefetch={false}
      onClick={(event) => {
        onClick?.(event);
        if (!followsToSamePage(event)) return;
        // next/link navigates after this handler, and a navigation discards a
        // refresh that is in progress, so the refresh must start after it.
        queueMicrotask(() => {
          router.refresh();
        });
      }}
    />
  );
}
