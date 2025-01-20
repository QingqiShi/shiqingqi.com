import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@/breakpoints";
import { lightTheme, darkTheme, color, font } from "@/tokens.stylex";

export const globalStyles = stylex.create({
  global: {
    backgroundColor: color.backgroundMain,
    colorScheme: color.colorScheme,
    fontSize: {
      default: "16px",
      [breakpoints.sm]: "18px",
      [breakpoints.md]: "20px",
      [breakpoints.lg]: "24px",
      [breakpoints.xl]: "26px",
    },
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
      const rootProps = stylex.props(darkTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
    case "light": {
      const rootProps = stylex.props(lightTheme, globalStyles.global);
      return rootProps.className ?? "";
    }
    default: {
      const rootProps = stylex.props(globalStyles.global);
      return rootProps.className ?? "";
    }
  }
}
