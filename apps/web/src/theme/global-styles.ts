import * as stylex from "@stylexjs/stylex";
import { root } from "@tuja/ui/primitives/root.stylex";

// Every color token is a `light-dark()` pair, so theming is driven entirely by
// `color-scheme`: the default follows the OS preference, and forcing a theme
// just pins the scheme — no per-theme variable sets exist.
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
  switch (theme) {
    case "dark": {
      const rootProps = stylex.props(root.html, globalStyles.forceDark);
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = stylex.props(root.html, globalStyles.forceLight);
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = stylex.props(root.html);
      return rootProps.className ?? "";
    }
  }
}
