"use client";

import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";
import { useLayoutEffect, useRef, useState } from "react";
import { getDocumentClassName } from "@/app/global-styles";
import { Button } from "@/components/shared/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import type { SwitchState } from "./switch";
import { Switch } from "./switch";

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

    metaTag.setAttribute(
      "content",
      !theme || theme === "system"
        ? preferDark
          ? "#000000"
          : "#ffffff"
        : theme === "dark"
          ? "#000000"
          : "#ffffff",
    );
  }, [theme, preferDark]);

  const [hasFocus, setHasFocus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "block relative text-base",
        // System button visibility logic
        !theme || theme === "system"
          ? "[--system-left:0] [--system-opacity:0] [--system-pointer:none]"
          : hasFocus
            ? "[--system-left:-100%] [--system-opacity:1] [--system-pointer:all]"
            : "[--system-left:0] hover:[--system-left:-100%] [--system-opacity:0] hover:[--system-opacity:1] [--system-pointer:none] hover:[--system-pointer:all]",
      )}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget)) {
          setHasFocus(false);
        }
      }}
      onMouseLeave={() => setHasFocus(false)}
    >
      {/* System button */}
      <div
        className={cn(
          "absolute left-0 top-0 pr-2",
          "opacity-[var(--system-opacity)]",
          "pointer-events-[var(--system-pointer)]",
          "translate-x-[var(--system-left)]",
          "transition-all duration-200 ease-out",
        )}
      >
        <Button
          role="radio"
          aria-label={labels[2]}
          aria-checked={!theme || theme === "system"}
          onClick={() => setTheme("system")}
          disabled={!theme || theme === "system"}
          title={labels[2]}
        >
          <div className="relative w-[24px] h-[24px] md:w-[16px] md:h-[16px] text-base md:text-[16px]">
            <MoonIcon weight="fill" className="absolute bottom-0 left-0" />
            <SunIcon weight="fill" className="absolute top-0 right-0" />
          </div>
        </Button>
      </div>

      {/* Switch */}
      <Switch
        id="theme-switch"
        className="bg-gray-2 dark:bg-grayDark-2 data-[state=checked]:bg-gray-2 dark:data-[state=checked]:bg-grayDark-2"
        value={
          !theme || theme === "system"
            ? themeMap[preferDark ? "dark" : "light"]
            : themeMap[theme]
        }
        onChange={(state) => setTheme(state === "on" ? "dark" : "light")}
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

      {/* Moon icon */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[40px] md:w-[32px] flex items-center justify-center pointer-events-none aspect-square text-base"
        aria-hidden
      >
        <MoonIcon weight="fill" />
      </span>

      {/* Sun icon */}
      <span
        className="absolute right-0 top-0 bottom-0 w-[40px] md:w-[32px] flex items-center justify-center pointer-events-none aspect-square text-base"
        aria-hidden
      >
        <SunIcon weight="fill" />
      </span>
    </div>
  );
}
