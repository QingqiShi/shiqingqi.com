"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowClockwise, Moon, Sun } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { getDocumentClassName } from "../app/globalStyles";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Button } from "../server-components/button";
import { tokens } from "../tokens.stylex";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const theme = searchParams.get("theme");
  const isSystem = theme !== "dark" && theme !== "light";

  const preferDark = useMediaQuery("(prefers-color-scheme: dark)", false);

  const [hasFocus, setHasFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.className = getDocumentClassName(theme);
  }, [theme]);

  return (
    <div
      ref={containerRef}
      {...stylex.props(
        styles.container,
        isSystem && styles.hideSystemButton,
        !isSystem && hasFocus && styles.showSystemButton
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
          isSystem ? themeMap[preferDark ? "dark" : "light"] : themeMap[theme]
        }
        onChange={(state) => {
          if (state === "on") {
            const params = new URLSearchParams(searchParams);
            params.set("theme", "dark");
            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
          } else {
            const params = new URLSearchParams(searchParams);
            params.set("theme", "light");
            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
          }
        }}
        aria-label={
          labels[isSystem ? (preferDark ? 0 : 1) : theme === "dark" ? 0 : 1]
        }
        style={styles.switch}
      />
      <div {...stylex.props(styles.systemButton)}>
        <Button
          role="radio"
          aria-label={labels[2]}
          aria-checked={isSystem}
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.delete("theme");
            router.replace(`${pathname}?${params.toString()}`, {
              scroll: false,
            });
          }}
          disabled={isSystem}
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
    [themeSwitchTokens.systemRight]: { default: null, ":hover": "2.5rem" },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": "1" },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": "all" },
  },
  hideSystemButton: {
    [themeSwitchTokens.systemRight]: { default: null, ":hover": null },
    [themeSwitchTokens.systemOpacity]: { default: null, ":hover": null },
    [themeSwitchTokens.systemPointerEvents]: { default: null, ":hover": null },
  },
  showSystemButton: {
    [themeSwitchTokens.systemRight]: { default: "2.5rem", ":hover": "2.5rem" },
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
    padding: "0.4rem",
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
    paddingLeft: "0.5rem",
    right: 0,
    transition: "transform 0.2s ease, opacity 0.2s ease",
    transform: `translateX(${themeSwitchTokens.systemRight})`,
    opacity: themeSwitchTokens.systemOpacity,
    pointerEvents: themeSwitchTokens.systemPointerEvents,
  },
});
