import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

// Every color token is a `light-dark()` pair, so theming is driven entirely by
// `color-scheme`: the default follows the OS preference, and forcing a theme
// just pins the scheme — no per-theme variable sets exist.
export const globalStyles = stylex.create({
  global: {
    backgroundColor: color.bgCanvas,
    colorScheme: "light dark",
    fontSize: "16px",
  },
  forceLight: {
    colorScheme: "light",
  },
  forceDark: {
    colorScheme: "dark",
  },
  body: {
    color: color.textMain,
    fontFamily: font.family,
    position: "relative",
  },
});

export function getDocumentClassName(theme?: string | null) {
  switch (theme) {
    case "dark": {
      const rootProps = stylex.props(
        globalStyles.global,
        globalStyles.forceDark,
      );
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = stylex.props(
        globalStyles.global,
        globalStyles.forceLight,
      );
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = stylex.props(globalStyles.global);
      return rootProps.className ?? "";
    }
  }
}
