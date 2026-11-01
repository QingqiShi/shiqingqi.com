"use client";

import type { ComponentProps } from "react";
import { Link } from "./link.tsx";

/** The routing props a caller may add on top of a `@tuja/ui` link's own. */
export type RoutingProps = Pick<
  ComponentProps<typeof Link>,
  "replace" | "scroll" | "shallow"
>;

/**
 * The link Slot of `@tuja/ui`'s `Anchor` and `AnchorButton`, bound to
 * next/link: `className` and `style` carry the whole look, so they go onto
 * `Link` as attributes.
 */
export function RouterLink(
  props: ComponentProps<"a"> & { href: string } & RoutingProps,
) {
  return <Link {...props} />;
}
