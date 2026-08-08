import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { flex } from "../primitives/flex.stylex.ts";
import { border, color, font, space } from "../tokens.stylex.ts";

type BadgeVariant =
  "default" | "neutral" | "info" | "success" | "warning" | "danger" | "accent";
type BadgeSize = "small" | "medium";

interface BadgeProps extends Omit<
  ComponentProps<"span">,
  "className" | "style"
> {
  /**
   * Which colour the badge carries. `"default"` is the only bordered one — a
   * plain surface. The other six are the Intents, each a borderless tint; of
   * those, `"neutral"` is the muted one for low-emphasis metadata.
   */
  variant?: BadgeVariant;
  /** Padding and type scale. Defaults to `"medium"`. */
  size?: BadgeSize;
  /** Optional leading icon, rendered decoratively (`aria-hidden`). */
  icon?: ReactNode;
  /** Badge contents — usually a short label. */
  children: ReactNode;
}

/**
 * Compact status / label badge. Renders an inline `<span>` and forwards native
 * span attributes (`id`, `onClick`, `data-*`, `ref`) so a caller can attach
 * behaviour or one-off overrides without a wrapper. The `css` prop is composed
 * last, letting a caller win over the variant defaults.
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
    borderRadius: border.radius_round,
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
  // Borderless low-emphasis badge. Uses the neutral intent tint (like Callout's
  // neutral) rather than an opaque surface, so it stays visible on cards and
  // raised surfaces instead of blending into a same-colour parent.
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
