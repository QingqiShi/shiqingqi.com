import * as x from "@stylexjs/stylex";
import type { Breakpoints } from "../types";
import { darkTheme, systemTheme, tokens } from "./tokens.stylex";

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const md: Breakpoints["md"] =
  "@media (min-width: 768px) and (max-width: 1079px)";
const lg: Breakpoints["lg"] =
  "@media (min-width: 1080px) and (max-width: 1999px)";
const minXl: Breakpoints["minXl"] = "@media (min-width: 2000px)";

export const globalStyles = x.create({
  global: {
    margin: 0,
    fontSize: {
      default: "16px",
      [sm]: "18px",
      [md]: "20px",
      [lg]: "24px",
      [minXl]: "calc(24 / 2000 * 100vw)",
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
      const rootProps = x.props(darkTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = x.props(globalStyles.global);
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = x.props(systemTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
  }
}
