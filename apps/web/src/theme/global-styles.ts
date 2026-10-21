import * as stylex from "@stylexjs/stylex";
import { root } from "@tuja/ui/primitives/root.stylex";
import {
  financeTheme,
  isFinancePath,
} from "#src/finance/theme/finance-theme.ts";

// Every color token is a `light-dark()` pair, so theming is driven entirely by
// `color-scheme`: the default follows the OS preference, and forcing a theme
// just pins the scheme — no per-theme variable sets exist. A Finance page also
// gets `financeTheme`, which changes the accent and nothing else.
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

export function getDocumentClassName(
  theme?: string | null,
  pathname: string | null = null,
) {
  const appTheme = isFinancePath(pathname) && financeTheme;
  switch (theme) {
    case "dark": {
      const rootProps = stylex.props(
        root.html,
        globalStyles.forceDark,
        appTheme,
      );
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = stylex.props(
        root.html,
        globalStyles.forceLight,
        appTheme,
      );
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = stylex.props(root.html, appTheme);
      return rootProps.className ?? "";
    }
  }
}
