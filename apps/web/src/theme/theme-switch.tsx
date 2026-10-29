"use client";

import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { Button } from "@tuja/ui/components/button";
import {
  useResolvedTheme,
  useSystemTheme,
} from "@tuja/ui/hooks/use-resolved-theme";
import { useTheme } from "@tuja/ui/hooks/use-theme";

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
  const [, setTheme] = useTheme();
  const systemTheme = useSystemTheme();
  const resolvedTheme = useResolvedTheme();
  const target = resolvedTheme === "dark" ? "light" : "dark";

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
