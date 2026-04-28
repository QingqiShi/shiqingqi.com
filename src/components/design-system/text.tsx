import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { color, font } from "#src/tokens.stylex.ts";

type TextElement = "p" | "span" | "div";
type TextVariant = "body" | "bodySmall" | "caption" | "overline";
type TextTone = "default" | "muted" | "subtle" | "accent";
type TextWeight = "regular" | "medium" | "semibold" | "bold";
type TextAlign = "start" | "center" | "end";

interface TextProps {
  as?: TextElement;
  variant?: TextVariant;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextAlign;
  css?: StyleXStyles;
  children: ReactNode;
}

export function Text({
  as = "p",
  variant = "body",
  tone = "default",
  weight,
  align,
  css,
  children,
}: TextProps) {
  const composedCss = [
    styles.base,
    variantStyles[variant],
    toneStyles[tone],
    variant === "overline" && weight === undefined
      ? weightStyles.semibold
      : null,
    weight ? weightStyles[weight] : null,
    align ? alignStyles[align] : null,
    css,
  ];

  switch (as) {
    case "p":
      return <p css={composedCss}>{children}</p>;
    case "span":
      return <span css={composedCss}>{children}</span>;
    case "div":
      return <div css={composedCss}>{children}</div>;
  }
}

const styles = stylex.create({
  base: {
    margin: 0,
  },
});

const variantStyles = stylex.create({
  body: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
  },
  bodySmall: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
  },
  caption: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
  },
  overline: {
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_3,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },
});

const toneStyles = stylex.create({
  default: { color: color.textMain },
  muted: { color: color.textMuted },
  subtle: { color: color.textSubtle },
  accent: { color: color.textAccent },
});

const weightStyles = stylex.create({
  regular: { fontWeight: font.weight_4 },
  medium: { fontWeight: font.weight_5 },
  semibold: { fontWeight: font.weight_6 },
  bold: { fontWeight: font.weight_7 },
});

const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});
