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
  // The content of the shell is at the top centre of each screen, so it is the
  // fill of the content.
  html: {
    backgroundColor: color.background,
  },
});

export function getDocumentClassName(theme?: string | null) {
  const forced =
    theme === "dark"
      ? globalStyles.forceDark
      : theme === "light" && globalStyles.forceLight;
  return stylex.props(root.html, forced, globalStyles.html).className ?? "";
}
