"use client";

import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { gray } from "@tuja/ui/palette/gray.stylex";
import { useLayoutEffect } from "react";
import { getDocumentClassName } from "./global-styles.ts";
import { prePaintThemeColorId } from "./theme-hack.ts";
import { useResolvedTheme } from "./use-resolved-theme.ts";
import { useTheme } from "./use-theme.ts";

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
    document.getElementById(prePaintThemeColorId)?.remove();
  }, [isHydrated, theme]);

  if (!isHydrated) return null;

  // Mirror `color.bgCanvas` so the mobile browser chrome matches the page
  // background: light canvas is `gray._97`, dark is `gray._0`. Keep this in
  // sync with the pre-hydration `themeHack` script to avoid a color flash.
  return (
    <meta
      name="theme-color"
      content={resolvedTheme === "dark" ? gray._0 : gray._97}
    />
  );
}
