import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { corner } from "../../primitives/corner.stylex.ts";
import { flex } from "../../primitives/flex.stylex.ts";
import { border, color, font, space } from "../../tokens.stylex.ts";

interface BadgeProps extends Omit<
  ComponentProps<"span">,
  "className" | "style"
> {
  /**
   * Which colour the badge carries. `"default"` is the only bordered one; the
   * other six are Intents, and `"neutral"` is the muted one for low-emphasis
   * metadata.
   */
  variant?:
    | "default"
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "accent";
  /** Padding and type scale. Defaults to `"medium"`. */
  size?: "small" | "medium";
  /** Optional leading icon, rendered decoratively (`aria-hidden`). */
  icon?: ReactNode;
  /** Badge contents — usually a short label. */
  children: ReactNode;
}

/**
 * Compact status / label badge. Forwards native span attributes so a caller
 * can attach behaviour without a wrapper; `css` composes last, so a caller
 * wins over the variant defaults.
 */
export function Badge({
  variant = "default",
  size = "medium",
  icon,
  css,
  ref,
  children,
  ...restProps
}: BadgeProps) {
  return (
    <span
      {...restProps}
      ref={ref}
      css={[
        flex.inlineCenter,
        corner.radius_round,
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        css,
      ]}
    >
      {icon ? (
        <span css={[flex.inlineCenter, styles.icon]} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

const styles = stylex.create({
  base: {
    fontWeight: font.weight_6,
    whiteSpace: "nowrap",
    lineHeight: font.lineHeight_2,
    gap: space._0,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: "transparent",
  },
  // `em` box so the icon tracks the badge's font-size across sizes.
  icon: {
    inlineSize: "1em",
    blockSize: "1em",
    color: "currentColor",
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

const variantStyles = stylex.create({
  default: {
    backgroundColor: color.bgSurface,
    color: color.textMuted,
    borderColor: color.neutralBorder,
  },
  // Neutral intent tint, not an opaque surface, so it stays visible on cards
  // and other raised surfaces instead of blending in.
  neutral: {
    backgroundColor: color.surfaceNeutralSubtle,
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
