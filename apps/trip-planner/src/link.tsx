"use client";

import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * `next/link` that never prefetches: not in view, and not on hover or focus.
 * A path in the app keeps the locale of the page, so `/gb` on a Chinese page
 * goes to `/zh/gb`.
 */
export function Link({
  href,
  ...props
}: Omit<ComponentProps<typeof NextLink>, "prefetch">) {
  const locale = useLocale();
  const localeHref =
    typeof href === "string" && href.startsWith("/")
      ? getLocalePath(href, locale)
      : href;
  return <NextLink {...props} href={localeHref} prefetch={false} />;
}
