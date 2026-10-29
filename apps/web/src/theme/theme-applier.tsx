"use client";

import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { useResolvedTheme } from "@tuja/ui/hooks/use-resolved-theme";
import { useTheme } from "@tuja/ui/hooks/use-theme";
import { useLayoutEffect } from "react";
import { getDocumentClassName } from "./global-styles.ts";
import { prePaintThemeColorAttribute, themeColors } from "./theme-hack.ts";

/** Puts the stored Theme on the document and tints the mobile browser chrome to match. */
export function ThemeApplier() {
  const [theme] = useTheme();
  const resolvedTheme = useResolvedTheme();
  const isHydrated = useIsHydrated();

  useLayoutEffect(() => {
    // The hydration pass renders the server snapshot ("system"). The inline
    // `themeHack` already applied the stored theme, so wait for a client render.
    if (!isHydrated) return;
    document.documentElement.className = getDocumentClassName(theme);
    for (const meta of document.querySelectorAll(
      `[${prePaintThemeColorAttribute}]`,
    )) {
      meta.remove();
    }
  }, [isHydrated, theme]);

  if (!isHydrated) return null;

  return <meta name="theme-color" content={themeColors[resolvedTheme]} />;
}
