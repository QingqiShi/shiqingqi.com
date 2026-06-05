import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { useTheme } from "#src/hooks/use-theme.ts";

export type ResolvedTheme = "light" | "dark";

/**
 * Resolves the active theme to a concrete "light" | "dark", expanding the
 * "system" preference via the prefers-color-scheme media query. Use this rather
 * than re-deriving the same `theme === "system" ? prefersDark : theme` branch at
 * each call site.
 */
export function useResolvedTheme(): ResolvedTheme {
  const [theme] = useTheme();
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)", false);
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}
