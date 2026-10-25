"use client";

import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { getDocumentClassName } from "./global-styles.ts";
import { getThemeColors, prePaintThemeColorAttribute } from "./theme-hack.ts";
import { useResolvedTheme } from "./use-resolved-theme.ts";
import { useTheme } from "./use-theme.ts";

/** Puts the stored Theme on the document and tints the mobile browser chrome to match. */
export function ThemeApplier() {
  const [theme] = useTheme();
  const resolvedTheme = useResolvedTheme();
  const isHydrated = useIsHydrated();
  const pathname = usePathname();

  useLayoutEffect(() => {
    // The hydration pass renders the server snapshot ("system"). The inline
    // `themeHack` already applied the stored theme, so wait for a client render.
    if (!isHydrated) return;
    document.documentElement.className = getDocumentClassName(theme, pathname);
    for (const meta of document.querySelectorAll(
      `[${prePaintThemeColorAttribute}]`,
    )) {
      meta.remove();
    }
  }, [isHydrated, theme, pathname]);

  if (!isHydrated) return null;

  // The same colours as the pre-hydration `themeHack`, so the chrome does
  // not flash another colour.
  return getThemeColors(pathname).map((themeColor) => (
    <meta
      key={themeColor.media ?? ""}
      name="theme-color"
      media={themeColor.media}
      content={resolvedTheme === "dark" ? themeColor.dark : themeColor.light}
    />
  ));
}
