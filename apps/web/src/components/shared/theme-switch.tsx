"use client";

import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Switch, type SwitchState } from "@tuja/ui/components/switch";
import { gray } from "@tuja/ui/palette/gray";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { color, controlSize, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { useLayoutEffect, useRef, useState } from "react";
import { getDocumentClassName } from "#src/app/global-styles.ts";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";
import { themeSwitchTokens } from "./theme-switch.stylex";

const themeMap: { [theme in "light" | "dark"]: SwitchState } = {
  dark: "on",
  light: "off",
};

interface ThemeSwitchProps {
  /** [switchToLight, switchToDark, switchToSystem] */
  labels: [string, string, string];
  /**
   * Control size. `"md"` (default) matches the header chrome; `"sm"` is the
   * compact form for dense utility rows like the sidebar. Threads through to
   * the inner switch, system button, and icon overlays.
   */
  size?: "sm" | "md";
}

export function ThemeSwitch({ labels, size = "md" }: ThemeSwitchProps) {
  const isSmall = size === "sm";
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);

  const [theme, setTheme] = useTheme();
  useLayoutEffect(() => {
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
  }, [theme, preferDark]);

  // `hasFocus` tracks keyboard focus only. The mouse-hover reveal is handled
  // by pure CSS `:hover` on the container — don't tie it to JS state, and
  // in particular don't clear `hasFocus` on `mouseleave`, which would clobber
  // the keyboard reveal whenever the cursor happens to drift off the control
  // while focus is still inside.
  const [hasFocus, setHasFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      css={[
        styles.container,
        theme === "system" && styles.hideSystemButton,
        theme !== "system" && hasFocus && styles.showSystemButton,
      ]}
      onFocus={() => {
        setHasFocus(true);
      }}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setHasFocus(false);
        }
      }}
    >
      <div css={styles.systemButton}>
        <Button
          size={size}
          aria-label={labels[2]}
          isActive={theme === "system"}
          onClick={() => {
            if (theme === "system") return;
            setTheme("system");
          }}
          title={labels[2]}
        >
          <div
            css={[
              styles.systemIcon,
              isSmall ? sizeStyles.systemIconSm : sizeStyles.systemIconMd,
            ]}
          >
            <MoonIcon
              weight="fill"
              css={styles.systemMoon}
              aria-hidden="true"
            />
            <SunIcon weight="fill" css={styles.systemSun} aria-hidden="true" />
          </div>
        </Button>
      </div>
      <Switch
        size={size}
        css={styles.switch}
        value={
          theme === "system"
            ? themeMap[preferDark ? "dark" : "light"]
            : themeMap[theme]
        }
        onChange={(state) => {
          setTheme(state === "on" ? "dark" : "light");
        }}
        aria-label={
          labels[
            theme === "system" ? (preferDark ? 0 : 1) : theme === "dark" ? 0 : 1
          ]
        }
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
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": "-100%" },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: {
      default: "none",
      ":hover": "all",
    },
  },
  hideSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": null },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": null },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": null },
  },
  showSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: "-100%", ":hover": "-100%" },
    [themeSwitchTokens.systemOpacity]: { default: "1", ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: {
      default: "all",
      ":hover": "all",
    },
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
  systemButton: {
    left: 0,
    opacity: themeSwitchTokens.systemOpacity,
    paddingRight: space._1,
    pointerEvents: themeSwitchTokens.systemPointerEvents,
    position: "absolute",
    top: 0,
    transform: `translateX(${themeSwitchTokens.systemLeft})`,
    transition: {
      default: "transform 0.2s ease, opacity 0.2s ease",
      [motionConstants.REDUCED_MOTION]: "opacity 0.2s ease",
    },
  },
  systemIcon: {
    position: "relative",
  },
  systemSun: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  systemMoon: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
});

// The sun/moon overlays span one switch cell, so their width tracks the inner
// Switch's track height per size (`md` → controlSize._9, `sm` → controlSize._8),
// and the system-toggle glyph shrinks in step. `md` reproduces the historic
// (header) sizing.
const sizeStyles = stylex.create({
  iconMd: {
    width: controlSize._9,
    fontSize: font.uiBody,
  },
  iconSm: {
    width: controlSize._8,
    fontSize: font.uiBodySmall,
  },
  systemIconMd: {
    width: `calc(${controlSize._9} - ${controlSize._4})`,
    height: `calc(${controlSize._9} - ${controlSize._4})`,
    fontSize: controlSize._4,
  },
  systemIconSm: {
    width: `calc(${controlSize._8} - ${controlSize._4})`,
    height: `calc(${controlSize._8} - ${controlSize._4})`,
    fontSize: controlSize._3,
  },
});
