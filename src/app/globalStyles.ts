import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { darkTheme, systemTheme, tokens } from "@/tokens.stylex";

export const globalStyles = stylex.create({
  global: {
    margin: 0,
    fontSize: {
      default: "16px",
      [breakpoints.sm]: "18px",
      [breakpoints.md]: "20px",
      [breakpoints.lg]: "24px",
      [breakpoints.xl]: "calc(24 / 2000 * 100vw)",
    },
    backgroundColor: tokens.backgroundMain,
    colorScheme: tokens.colorScheme,
    minHeight: "100dvh",
  },
  body: {
    boxSizing: "border-box",
    color: tokens.textMain,
    fontFamily: tokens.fontFamily,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    position: "relative",
  },
});

export function getDocumentClassName(theme?: string | null) {
  switch (theme) {
    case "dark": {
      const rootProps = stylex.props(darkTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = stylex.props(globalStyles.global);
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = stylex.props(systemTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
  }
}
