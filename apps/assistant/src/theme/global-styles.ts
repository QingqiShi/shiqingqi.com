import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { root } from "@tuja/ui/primitives/root.stylex";
import { assistantTheme } from "#src/assistant/theme/assistant-theme.ts";

// Every color token is a `light-dark()` pair, so `color-scheme` alone decides
// the theme: the default follows the OS, and a stored theme pins the scheme.
// `assistantTheme` changes the accent and the canvas.
export const globalStyles = stylex.create({
  forceLight: {
    colorScheme: "light",
  },
  forceDark: {
    colorScheme: "dark",
  },
  body: {
    position: "relative",
  },
  // On a phone, an island fills the screen. Safari shows the page background
  // at the status bar and in the overscroll, so it is the island fill.
  html: {
    backgroundColor: {
      default: color.card,
      [breakpoints.md]: color.background,
    },
  },
});

export function getDocumentClassName(theme?: string | null) {
  const forced =
    theme === "dark"
      ? globalStyles.forceDark
      : theme === "light" && globalStyles.forceLight;
  return (
    stylex.props(root.html, forced, assistantTheme, globalStyles.html)
      .className ?? ""
  );
}
