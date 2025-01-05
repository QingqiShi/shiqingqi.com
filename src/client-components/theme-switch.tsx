"use client";

import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { Moon } from "@phosphor-icons/react/Moon";
import { Sun } from "@phosphor-icons/react/Sun";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { getDocumentClassName } from "@/app/globalStyles";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/server-components/button";
import { color, controlSize, font, ratio, space } from "@/tokens.stylex";
import type { SwitchState } from "./switch";
import { Switch } from "./switch";
import { themeSwitchTokens } from "./theme-switch.stylex";

const themeMap: { [theme in "light" | "dark"]: SwitchState } = {
  dark: "on",
  light: "off",
};

interface ThemeSwitchProps {
  /** [switchToLight, switchToDark, switchToSystem] */
  labels: [string, string, string];
}

export function ThemeSwitch({ labels }: ThemeSwitchProps) {
  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);

  const [theme, setTheme] = useTheme();
  useEffect(() => {
    document.documentElement.className = getDocumentClassName(theme);
    const existingMetaTag = document.querySelector("meta[name=theme-color]");
    const metaTag = existingMetaTag ?? document.createElement("meta");

    // When the route changes, Next will replace the head content, resulting
    // in the meta tag being removed, when this happens we must add it again.
    if (!existingMetaTag) {
      metaTag.setAttribute("name", "theme-color");
      document.head.appendChild(metaTag);
    }

    metaTag.setAttribute(
      "content",
      !theme || theme === "system"
        ? preferDark
          ? "#000000"
          : "#ffffff"
        : theme === "dark"
          ? "#000000"
          : "#ffffff"
    );
  }, [preferDark, theme]);

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
      onMouseLeave={() => {
        setHasFocus(false);
      }}
    >
      <div css={styles.systemButton}>
        <Button
          role="radio"
          aria-label={labels[2]}
          aria-checked={!theme || theme === "system"}
          onClick={() => {
            setTheme("system");
          }}
          disabled={!theme || theme === "system"}
          title={labels[2]}
        >
          <ArrowClockwise weight="fill" />
        </Button>
      </div>
      <Switch
        id="theme-switch"
        css={styles.switch}
        value={
          !theme || theme === "system"
            ? themeMap[preferDark ? "dark" : "light"]
            : themeMap[theme]
        }
        onChange={(state) => {
          if (state === "on") {
            setTheme("dark");
          } else {
            setTheme("light");
          }
        }}
        aria-label={
          labels[
            !theme || theme === "system"
              ? preferDark
                ? 0
                : 1
              : theme === "dark"
                ? 0
                : 1
          ]
        }
      />
      <span css={[styles.icon, styles.moon]} aria-hidden>
        <Moon weight="fill" />
      </span>
      <span css={[styles.icon, styles.sun]} aria-hidden>
        <Sun weight="fill" />
      </span>
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "block",
    position: "relative",
    fontSize: font.size_1,
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": `-100%` },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": "all" },
  },
  hideSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": null },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": null },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": null },
  },
  showSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: `-100%`, ":hover": `-100%` },
    [themeSwitchTokens.systemOpacity]: { default: "1", ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: {
      default: "all",
      ":hover": "all",
    },
  },
  switch: {
    [color.controlActive]: { default: color.backgroundRaised },
  },
  icon: {
    alignItems: "center",
    aspectRatio: ratio.square,
    bottom: 0,
    display: "flex",
    fontSize: font.size_1,
    justifyContent: "center",
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    width: controlSize._9,
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
    transition: "transform 0.2s ease, opacity 0.2s ease",
  },
});
