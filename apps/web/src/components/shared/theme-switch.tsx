"use client";

import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { Button } from "@tuja/ui/components/button";
import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { gray } from "@tuja/ui/palette/gray";
import { useLayoutEffect } from "react";
import { getDocumentClassName } from "#src/app/global-styles.ts";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";

interface ThemeSwitchProps {
  /** [switchToLight, switchToDark] */
  labels: [string, string];
  /**
   * Control size. `"md"` (default) matches the header chrome; `"sm"` is the
   * compact form for dense utility rows like the sidebar.
   */
  size?: "sm" | "md";
}

/**
 * An icon-only button that shows the resolved Theme and, when pressed, targets
 * the opposite one. It is a plain button, not a toggle: the accessible name
 * states the action, so the name changes with the Theme and there is no
 * `aria-pressed` to contradict it.
 */
export function ThemeSwitch({ labels, size = "md" }: ThemeSwitchProps) {
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  const systemTheme = preferDark ? "dark" : "light";

  const [theme, setTheme] = useTheme();
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const target = resolvedTheme === "dark" ? "light" : "dark";

  const isHydrated = useIsHydrated();
  useLayoutEffect(() => {
    // The hydration pass renders the server snapshot ("system"). The inline
    // `themeHack` already applied the stored theme, so wait for a client render.
    if (!isHydrated) return;

    document.documentElement.className = getDocumentClassName(theme);
    const existingMetaTag = document.querySelector("meta[name=theme-color]");
    const metaTag = existingMetaTag ?? document.createElement("meta");

    // When the route changes, Next will replace the head content, resulting
    // in the meta tag being removed, when this happens we must add it again.
    if (!existingMetaTag) {
      metaTag.setAttribute("name", "theme-color");
      document.head.appendChild(metaTag);
    }

    // Mirror `color.bgCanvas` so the mobile browser chrome matches the page
    // background: light canvas is `gray._97`, dark is `gray._0`. Keep this in
    // sync with the pre-hydration `themeHack` script to avoid a color flash.
    metaTag.setAttribute(
      "content",
      resolvedTheme === "dark" ? gray._0 : gray._97,
    );
  }, [isHydrated, theme, resolvedTheme]);

  return (
    <Button
      size={size}
      aria-label={target === "light" ? labels[0] : labels[1]}
      icon={
        resolvedTheme === "dark" ? (
          <MoonIcon weight="bold" />
        ) : (
          <SunIcon weight="bold" />
        )
      }
      onClick={() => {
        // Store "system", not the target, when the target matches the
        // system Theme. This lets the next press send the visitor back
        // to the system Theme, and stops the site from pinning a value
        // that only looks like a choice.
        setTheme(target === systemTheme ? "system" : target);
      }}
    />
  );
}
