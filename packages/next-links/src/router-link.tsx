"use client";

import { isBrowserLink } from "@tuja/ui/components/is-browser-link";
import type { ComponentProps } from "react";
import { Link } from "./link.tsx";

/** The routing props a caller may add on top of a `@tuja/ui` link's own. */
export type RoutingProps = Pick<
  ComponentProps<typeof Link>,
  "replace" | "scroll" | "shallow"
>;

type RouterLinkProps = ComponentProps<"a"> & { href: string };

/**
 * The link Slot of `@tuja/ui`'s `Anchor` and `Button`, bound to next/link:
 * `className` and `style` carry the whole look, so they go onto `Link` as
 * attributes. A link that the router cannot follow stays a plain `<a>`.
 */
export function RouterLink({
  replace,
  scroll,
  shallow,
  ...props
}: RouterLinkProps & RoutingProps) {
  if (isBrowserLink(props)) return <a {...props} />;
  return (
    <Link {...props} replace={replace} scroll={scroll} shallow={shallow} />
  );
}
