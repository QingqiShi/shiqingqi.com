"use client";

import {
  AnchorButton as UiAnchorButton,
  type AnchorButtonLinkProps,
} from "@tuja/ui/components/anchor-button";
import Link from "next/link";
import type { ComponentProps } from "react";
import { usePrefetchOnIntent } from "#src/hooks/use-prefetch-on-intent.ts";

type NextLinkProps = ComponentProps<typeof Link>;

/** The routing props a caller may add on top of the component's own. */
type RoutingProps = Pick<
  NextLinkProps,
  "prefetch" | "replace" | "scroll" | "shallow"
>;

type AnchorButtonProps = ComponentProps<typeof UiAnchorButton> & RoutingProps;

/**
 * The link Slot's contract, bound to next/link: `className` and `style` carry
 * the whole look, so they go onto `Link` as attributes.
 */
function RouterLink({
  children,
  className,
  href,
  onFocus,
  onMouseEnter,
  prefetch,
  ref,
  style,
  ...props
}: AnchorButtonLinkProps & RoutingProps) {
  const intent = usePrefetchOnIntent<HTMLAnchorElement>({
    prefetch,
    onMouseEnter,
    onFocus,
  });

  return (
    <Link
      {...props}
      href={href}
      ref={ref}
      prefetch={intent.prefetch}
      onMouseEnter={intent.onMouseEnter}
      onFocus={intent.onFocus}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}

/** `@tuja/ui`'s `AnchorButton`, routed through next/link. */
export function AnchorButton(props: AnchorButtonProps) {
  return <UiAnchorButton {...props} linkComponent={RouterLink} />;
}
