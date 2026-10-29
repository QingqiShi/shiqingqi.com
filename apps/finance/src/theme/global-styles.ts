import * as stylex from "@stylexjs/stylex";
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
});

export function getDocumentClassName(theme?: string | null) {
  const forced =
    theme === "dark"
      ? globalStyles.forceDark
      : theme === "light" && globalStyles.forceLight;
  return stylex.props(root.html, forced).className ?? "";
}
