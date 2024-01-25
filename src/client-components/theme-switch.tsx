"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, Moon, Sun } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useMediaQuery } from "../hooks/use-media-query";
import { Button } from "../server-components/button";
import { tokens } from "../tokens.stylex";
import { useTheme } from "../hooks/use-theme";
import { getDocumentClassName } from "../app/globalStyles";
import { Switch } from "./switch";
import type { SwitchState } from "./switch";
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
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute(
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
      {...stylex.props(
        styles.container,
        theme === "system" && styles.hideSystemButton,
        theme !== "system" && hasFocus && styles.showSystemButton
      )}
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
      <span {...stylex.props(styles.icon, styles.moon)} aria-hidden>
        <Moon weight="fill" />
      </span>
      <span {...stylex.props(styles.icon, styles.sun)} aria-hidden>
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
        style={styles.switch}
      />
      <div {...stylex.props(styles.systemButton)}>
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
    display: "inline-block",
    position: "relative",
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
    [tokens.controlActive]: { default: "#333" },
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
    paddingRight: "12px",
    left: 0,
    transition: "transform 0.2s ease, opacity 0.2s ease",
    transform: `translateX(${themeSwitchTokens.systemLeft})`,
    opacity: themeSwitchTokens.systemOpacity,
    pointerEvents: themeSwitchTokens.systemPointerEvents,
  },
});
