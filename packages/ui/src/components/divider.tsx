import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { color } from "../tokens.stylex.ts";

type DividerOrientation = "horizontal" | "vertical";
type DividerVariant = "subtle" | "bold" | "decorative";

interface DividerProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  css?: StyleXStyles;
}

export function Divider({
  orientation = "horizontal",
  variant = "subtle",
  css,
}: DividerProps) {
  if (orientation === "vertical") {
    const composedCss = [
      styles.base,
      styles.vertical,
      verticalVariantStyles[variant],
      css,
    ];
    return (
      <div role="separator" aria-orientation="vertical" css={composedCss} />
    );
  }

  const composedCss = [
    styles.base,
    styles.horizontal,
    horizontalVariantStyles[variant],
    css,
  ];
  return <hr css={composedCss} />;
}

const styles = stylex.create({
  base: {
    borderWidth: 0,
    borderStyle: "none",
    margin: 0,
    padding: 0,
  },
  horizontal: {
    inlineSize: "100%",
  },
  vertical: {
    blockSize: "100%",
  },
});

const horizontalVariantStyles = stylex.create({
  subtle: {
    blockSize: "1px",
    backgroundColor: color.neutralBorder,
  },
  bold: {
    blockSize: "2px",
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    blockSize: "1px",
    backgroundImage: `linear-gradient(135deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});

const verticalVariantStyles = stylex.create({
  subtle: {
    inlineSize: "1px",
    backgroundColor: color.neutralBorder,
  },
  bold: {
    inlineSize: "2px",
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    inlineSize: "1px",
    backgroundImage: `linear-gradient(180deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});
