import * as stylex from "@stylexjs/stylex";
import { lightTheme, darkTheme, color, font } from "@tuja/ui/tokens.stylex";

export const globalStyles = stylex.create({
  global: {
    backgroundColor: color.background,
    colorScheme: color.colorScheme,
    fontSize: "16px",
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
