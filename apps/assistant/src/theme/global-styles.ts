import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { root } from "@tuja/ui/primitives/root.stylex";

// Every color token is a `light-dark()` pair, so `color-scheme` alone decides
// the theme: the default follows the OS, and a stored theme pins the scheme.
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
  // Safari shows the page background at the status bar and in the overscroll.
  // Below 34rem, an island fills the screen, so it is the island fill. From
  // 34rem, the shell shows its sidebar fill around the islands.
  html: {
    backgroundColor: {
      default: color.card,
      "@media (min-width: 34rem)": color.sidebar,
    },
  },
});

export function getDocumentClassName(theme?: string | null) {
  const forced =
    theme === "dark"
      ? globalStyles.forceDark
      : theme === "light" && globalStyles.forceLight;
  return stylex.props(root.html, forced, globalStyles.html).className ?? "";
}
