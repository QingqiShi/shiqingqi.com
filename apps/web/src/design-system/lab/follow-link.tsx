"use client";

import { type ComponentProps, createContext, use } from "react";

/** What a `FollowLink` calls with its `href` when the visitor follows it. */
export const FollowContext = createContext<(href: string) => void>(
  () => undefined,
);

/**
 * Follows a link by telling the Specimen around it, as a router would, so the
 * Lab stays on its page.
 */
export function FollowLink({ onClick, ...props }: ComponentProps<"a">) {
  const follow = use(FollowContext);
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
        if (props.href !== undefined) follow(props.href);
      }}
    />
  );
}
