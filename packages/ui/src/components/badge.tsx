import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { flex } from "../primitives/flex.stylex.ts";
import { border, color, font, space } from "../tokens.stylex.ts";

type BadgeVariant =
  | "default"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";
type BadgeSize = "small" | "medium";

interface BadgeProps extends ComponentProps<"span"> {
  /**
   * Colour treatment. `"default"` is a bordered surface chip; `"neutral"` is a
   * borderless muted chip for low-emphasis metadata. The rest map to the
   * semantic status hues.
   */
  variant?: BadgeVariant;
  /** Padding and type scale. Defaults to `"medium"`. */
  size?: BadgeSize;
  /** Optional leading glyph, rendered decoratively (`aria-hidden`). */
  icon?: ReactNode;
  /** Chip contents — usually a short label. */
  children: ReactNode;
}

/**
 * Compact status / label chip. Renders an inline `<span>` and forwards native
 * span attributes (`id`, `onClick`, `data-*`, `className`, `style`, `ref`) so a
 * caller can attach behaviour or one-off overrides without a wrapper. The `css`
 * prop is composed last, letting a caller win over the variant defaults.
 */
export function Badge({
  variant = "default",
  size = "medium",
  icon,
  css,
  className,
  style,
  ref,
  children,
  ...restProps
}: BadgeProps) {
  return (
    <span
      {...restProps}
      ref={ref}
      className={className}
      style={style}
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
    backgroundColor: color.bgSurface,
    color: color.textMuted,
    borderColor: color.neutralBorder,
  },
  neutral: {
    backgroundColor: color.bgSurface,
    color: color.textMuted,
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
    color: color.accentText,
  },
});
