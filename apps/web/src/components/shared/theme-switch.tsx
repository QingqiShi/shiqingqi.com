"use client";

import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import * as stylex from "@stylexjs/stylex";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { gray } from "@tuja/ui/palette/gray";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, controlSize, font, ratio } from "@tuja/ui/tokens.stylex";
import { useLayoutEffect } from "react";
import { getDocumentClassName } from "#src/app/global-styles.ts";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useResolvedTheme } from "#src/hooks/use-resolved-theme.ts";
import { useTheme } from "#src/hooks/use-theme.ts";

const themeMap: { [theme in "light" | "dark"]: SwitchState } = {
  dark: "on",
  light: "off",
};

interface ThemeSwitchProps {
  /** [switchToLight, switchToDark] */
  labels: [string, string];
  /**
   * Control size. `"md"` (default) matches the header chrome; `"sm"` is the
   * compact form for dense utility rows like the sidebar. Threads through to
   * the inner switch and icon overlays.
   */
  size?: "sm" | "md";
}

export function ThemeSwitch({ labels, size = "md" }: ThemeSwitchProps) {
  const isSmall = size === "sm";
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);

  const [theme, setTheme] = useTheme();
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
      theme === "system"
        ? preferDark
          ? gray._0
          : gray._97
        : theme === "dark"
          ? gray._0
          : gray._97,
    );
  }, [isHydrated, theme, preferDark]);

  const resolvedTheme = useResolvedTheme();

  return (
    <div css={styles.container}>
      <Switch
        size={size}
        css={styles.switch}
        value={themeMap[resolvedTheme]}
        onChange={(state) => {
          const target = state === "on" ? "dark" : "light";
          const systemTheme = preferDark ? "dark" : "light";
          // Store "system", not the target, when the target matches the
          // system Theme. This lets the next press send the visitor back
          // to the system Theme, and stops the site from pinning a value
          // that only looks like a choice.
          setTheme(target === systemTheme ? "system" : target);
        }}
        aria-label={labels[resolvedTheme === "dark" ? 0 : 1]}
      />
      <span
        css={[
          flex.center,
          styles.icon,
          isSmall ? sizeStyles.iconSm : sizeStyles.iconMd,
          styles.moon,
        ]}
        aria-hidden
      >
        <MoonIcon weight="fill" />
      </span>
      <span
        css={[
          flex.center,
          styles.icon,
          isSmall ? sizeStyles.iconSm : sizeStyles.iconMd,
          styles.sun,
        ]}
        aria-hidden
      >
        <SunIcon weight="fill" />
      </span>
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "block",
    position: "relative",
    fontSize: font.uiBody,
  },
  switch: {
    [color.accent]: { default: color.bgSurfaceRaised },
  },
  icon: {
    aspectRatio: ratio.square,
    bottom: 0,
    pointerEvents: "none",
    position: "absolute",
    top: 0,
  },
  moon: {
    left: 0,
  },
  sun: {
    right: 0,
  },
});

// The sun/moon overlays span one switch cell, so their width tracks the inner
// Switch's track height per size (`md` → controlSize._9, `sm` → controlSize._8).
// `md` reproduces the historic (header) sizing.
const sizeStyles = stylex.create({
  iconMd: {
    width: controlSize._9,
    fontSize: font.uiBody,
  },
  iconSm: {
    width: controlSize._8,
    fontSize: font.uiBodySmall,
  },
});
