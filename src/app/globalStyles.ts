import * as stylex from "@stylexjs/stylex";
import { Breakpoints } from "../types";
import { darkTheme, systemTheme, tokens } from "./tokens.stylex";

const sm: Breakpoints["sm"] = "@media (min-width: 320px)";
const md: Breakpoints["md"] = "@media (min-width: 768px)";
const lg: Breakpoints["lg"] = "@media (min-width: 1080px)";
const xl: Breakpoints["xl"] = "@media (min-width: 2000px)";

export const globalStyles = stylex.create({
  global: {
    margin: 0,
    fontSize: {
      default: "16px",
      [sm]: "18px",
      [md]: "20px",
      [lg]: "24px",
      [xl]: "calc(24 / 2000 * 100vw)",
    },
    backgroundColor: tokens.backgroundMain,
    colorScheme: tokens.colorScheme,
  },
  body: {
    boxSizing: "border-box",
    color: tokens.textMain,
    fontFamily: tokens.fontFamily,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
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
