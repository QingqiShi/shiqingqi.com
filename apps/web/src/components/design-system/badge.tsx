import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, font, space } from "#src/tokens.stylex.ts";

type BadgeVariant =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";
type BadgeSize = "small" | "medium";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  css?: StyleXStyles;
  children: ReactNode;
}

export function Badge({
  variant = "default",
  size = "medium",
  icon,
  css,
  children,
}: BadgeProps) {
  return (
    <span
      css={[
        flex.inlineCenter,
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        css,
      ]}
    >
      {icon ? (
        <span css={[flex.inlineCenter, iconSizeStyles[size]]} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

const styles = stylex.create({
  base: {
    borderRadius: border.radius_round,
    fontWeight: font.weight_6,
    whiteSpace: "nowrap",
    lineHeight: font.lineHeight_2,
    gap: space._0,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
  },
});

const sizeStyles = stylex.create({
  small: {
    paddingBlock: space._00,
    paddingInline: space._1,
    fontSize: font.uiOverline,
  },
  medium: {
    paddingBlock: space._0,
    paddingInline: space._2,
    fontSize: font.uiCaption,
  },
});

const iconSizeStyles = stylex.create({
  small: {
    inlineSize: "0.7rem",
    blockSize: "0.7rem",
    color: "currentColor",
  },
  medium: {
    inlineSize: "0.8rem",
    blockSize: "0.8rem",
    color: "currentColor",
  },
});

const variantStyles = stylex.create({
  default: {
    backgroundColor: color.backgroundRaised,
    color: color.textMuted,
    borderColor: color.borderSubtle,
  },
  info: {
    backgroundColor: color.surfaceInfoSubtle,
    color: color.infoText,
  },
  success: {
    backgroundColor: color.surfaceSuccessSubtle,
    color: color.successText,
  },
  warning: {
    backgroundColor: color.surfaceWarningSubtle,
    color: color.warningText,
  },
  danger: {
    backgroundColor: color.surfaceDangerSubtle,
    color: color.dangerText,
  },
  accent: {
    backgroundColor: color.surfaceAccentSubtle,
    color: color.textAccent,
  },
});
