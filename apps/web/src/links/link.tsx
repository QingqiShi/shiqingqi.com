"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";

/** `next/link` that never prefetches: not in view, and not on hover or focus. */
export function Link(props: Omit<ComponentProps<typeof NextLink>, "prefetch">) {
  return <NextLink {...props} prefetch={false} />;
}
