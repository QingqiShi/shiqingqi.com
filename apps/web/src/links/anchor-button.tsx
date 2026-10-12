"use client";

import {
  AnchorButton as UiAnchorButton,
  type AnchorButtonLinkProps,
} from "@tuja/ui/components/anchor-button";
import type { ComponentProps } from "react";
import { Link } from "./link.tsx";

type LinkProps = ComponentProps<typeof Link>;

/** The routing props a caller may add on top of the component's own. */
type RoutingProps = Pick<LinkProps, "replace" | "scroll" | "shallow">;

type AnchorButtonProps = ComponentProps<typeof UiAnchorButton> & RoutingProps;

/**
 * The link Slot's contract, bound to next/link: `className` and `style` carry
 * the whole look, so they go onto `Link` as attributes.
 */
function RouterLink({
  children,
  className,
  href,
  ref,
  style,
  ...props
}: AnchorButtonLinkProps & RoutingProps) {
  return (
    <Link {...props} href={href} ref={ref} className={className} style={style}>
      {children}
    </Link>
  );
}

/** `@tuja/ui`'s `AnchorButton`, routed through next/link. */
export function AnchorButton(props: AnchorButtonProps) {
  return <UiAnchorButton {...props} linkComponent={RouterLink} />;
}
