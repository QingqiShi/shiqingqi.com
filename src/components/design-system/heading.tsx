import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { color, font } from "#src/tokens.stylex.ts";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingVariant = "display" | "h1" | "h2" | "h3" | "h4";
type HeadingAlign = "start" | "center" | "end";

interface HeadingProps {
  level?: HeadingLevel;
  variant?: HeadingVariant;
  align?: HeadingAlign;
  css?: StyleXStyles;
  children: ReactNode;
}

function defaultVariantForLevel(level: HeadingLevel): HeadingVariant {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    default:
      return "h4";
  }
}

export function Heading({
  level = 2,
  variant,
  align,
  css,
  children,
}: HeadingProps) {
  const resolvedVariant = variant ?? defaultVariantForLevel(level);
  const composedCss = [
    styles.base,
    variantStyles[resolvedVariant],
    align ? alignStyles[align] : null,
    css,
  ];

  switch (level) {
    case 1:
      return <h1 css={composedCss}>{children}</h1>;
    case 2:
      return <h2 css={composedCss}>{children}</h2>;
    case 3:
      return <h3 css={composedCss}>{children}</h3>;
    case 4:
      return <h4 css={composedCss}>{children}</h4>;
    case 5:
      return <h5 css={composedCss}>{children}</h5>;
    case 6:
      return <h6 css={composedCss}>{children}</h6>;
  }
}

const styles = stylex.create({
  base: {
    margin: 0,
    color: color.textMain,
  },
});

const variantStyles = stylex.create({
  display: {
    fontSize: font.uiDisplay,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
  },
  h1: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_2,
    letterSpacing: font.trackingSnug,
  },
  h2: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  h3: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  h4: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_3,
  },
});

const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});
