import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { flex } from "../../primitives/flex.stylex.ts";
import { color, font, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { chipSurface } from "../actions/chip.stylex.ts";

interface BadgeProps extends Omit<
  ComponentProps<"span">,
  "className" | "style"
> {
  /**
   * Which colour the badge carries. `"default"` is the only bordered one; the
   * other six are Intents, and `"neutral"` is the muted one for low-emphasis
   * metadata.
   *
   * @zh 徽章所承载的颜色。`"default"` 是唯一带边框的样式；其余六种为意图色，`"neutral"` 是用于低强调元信息的柔和样式。
   */
  intent?:
    | "default"
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "accent";
  /**
   * Padding and type scale.
   *
   * @zh 内边距与字号。
   */
  size?: "sm" | "md";
  /**
   * Optional leading icon, rendered decoratively (`aria-hidden`).
   *
   * @zh 可选的前置图标，以装饰性方式渲染（`aria-hidden`）。
   */
  icon?: ReactNode;
  /**
   * Badge contents — usually a short label.
   *
   * @zh 徽章内容——通常是简短的标签。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the badge's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在徽章自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * Compact status / label badge. It shares `Chip`'s pill skin, sized on the
 * `space` scale rather than `controlSize` because nothing here is pressed.
 * Forwards native span attributes so a caller can attach behaviour without a
 * wrapper; `css` composes last, so a caller wins over the intent defaults.
 */
export function Badge({
  intent = "default",
  size = "md",
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
        chipSurface.base,
        styles.base,
        sizeStyles[size],
        intentStyles[intent],
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
    borderColor: "transparent",
    fontWeight: font.weight_6,
  },
  // `em` box so the icon tracks the badge's font-size across sizes.
  icon: {
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
    color: "currentColor",
  },
});

const sizeStyles = stylex.create({
  sm: {
    paddingBlock: space._00,
    paddingInline: space._1,
    fontSize: font.uiOverline,
  },
  md: {
    paddingBlock: space._0,
    paddingInline: space._2,
    fontSize: font.uiCaption,
  },
});

// `base` drops the pill's hairline so every Intent carries its meaning as a
// tint; only `default` puts the border back.
const intentStyles = stylex.create({
  default: {
    borderColor: color.neutralBorder,
    color: color.textMuted,
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
