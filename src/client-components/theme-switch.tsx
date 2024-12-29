"use client";

import { ArrowClockwise, Moon, Sun } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { getDocumentClassName } from "@/app/globalStyles";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/server-components/button";
import { tokens } from "@/tokens.stylex";
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
        styles.switch,
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
      <span css={[styles.icon, styles.moon]} aria-hidden>
        <Moon weight="fill" />
      </span>
      <span css={[styles.icon, styles.sun]} aria-hidden>
        <Sun weight="fill" />
      </span>
      <Switch
        id="theme-switch"
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
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "block",
    position: "relative",
    fontSize: "16px",
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": "-60px" },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": "all" },
  },
  hideSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: null, ":hover": null },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": null },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": null },
  },
  showSystemButton: {
    [themeSwitchTokens.systemLeft]: { default: "-60px", ":hover": "-60px" },
    [themeSwitchTokens.systemOpacity]: { default: "1", ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: {
      default: "all",
      ":hover": "all",
    },
  },
  switch: {
    [tokens.controlActive]: { default: tokens.backgroundRaised },
  },
  icon: {
    position: "absolute",
    zIndex: 100,
    top: 0,
    bottom: 0,
    display: "flex",
    alignItems: "center",
    padding: "9.6px",
    pointerEvents: "none",
    fontSize: "1.3em",
  },
  moon: {
    left: 0,
  },
  sun: {
    right: 0,
  },
  systemButton: {
    position: "absolute",
    top: 0,
    paddingRight: "2rem",
    left: 0,
    transition: "transform 0.2s ease, opacity 0.2s ease",
    transform: `translateX(${themeSwitchTokens.systemLeft})`,
    opacity: themeSwitchTokens.systemOpacity,
    pointerEvents: themeSwitchTokens.systemPointerEvents,
  },
});
