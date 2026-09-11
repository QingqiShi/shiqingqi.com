import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { transition } from "../../primitives/motion.stylex.ts";
import { color } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { chipSize, chipSurface } from "./chip.stylex.ts";

interface ChipBaseProps {
  /**
   * Chip contents — usually a short label.
   *
   * @zh 标签按钮的内容——通常是简短标签。
   */
  children: ReactNode;
  /**
   * Decorative leading icon, rendered `aria-hidden`.
   *
   * @zh 装饰性前置图标，以 `aria-hidden` 渲染。
   */
  icon?: ReactNode;
  /**
   * Trailing content — a count, a note, a caret. Unlike `icon` it stays in the
   * accessibility tree, so it reads as part of the chip's name.
   *
   * @zh 尾部内容——计数、备注或箭头。与 `icon` 不同，它保留在无障碍树中，因此会作为标签按钮名称的一部分被朗读。
   */
  trailing?: ReactNode;
  /**
   * Height and type scale.
   *
   * @zh 高度与字号阶梯。
   */
  size?: "sm" | "md";
  /**
   * Paints the chip as the selected one. On the button form this also emits
   * `aria-pressed`; on the anchor form it's visual only — mark the current
   * link with `aria-current` yourself.
   *
   * @zh 将标签按钮绘制为选中态。按钮形态下还会输出 `aria-pressed`；锚点形态下仅有视觉效果——请自行用 `aria-current` 标记当前链接。
   */
  isActive?: boolean;
  /**
   * StyleX styles merged over the chip's own — composed last so a caller wins.
   *
   * @zh 最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。
   */
  css?: StyleProp;
}

/**
 * A chip is either a link or a button, never an inert `<div>` with a click
 * handler. `href` discriminates the two so each form forwards exactly the
 * native attributes its element accepts.
 */
type ChipProps = ChipBaseProps &
  (
    | ({
        /**
         * Renders an anchor instead of a button, forwarding the rest of
         * `<a>`'s native attributes.
         *
         * @zh 渲染为锚点而非按钮，并转发 `<a>` 的其余原生属性。
         */
        href: string;
      } & Omit<ComponentProps<"a">, "children" | "className" | "style">)
    | ({ href?: undefined } & Omit<
        ComponentProps<"button">,
        "children" | "className" | "style"
      >)
  );

/**
 * A compact interactive pill: an `<a>` when `href` is set, a `<button>`
 * otherwise. For a framework `<Link>`, compose `chipSurface`/`chipSize` from
 * `@tuja/ui/components/chip.stylex` directly instead.
 */
export function Chip(props: ChipProps) {
  const { children, icon, trailing, size = "md", isActive, css } = props;

  const chipCss = [
    chipSurface.base,
    chipSize[size],
    chipSurface.interactive,
    transition.colors,
    isActive === true && chipSurface.active,
    css,
  ];

  const content = (
    <>
      {icon ? (
        <span css={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
      {trailing ? (
        <span
          css={[styles.trailing, isActive === true && styles.trailingActive]}
        >
          {trailing}
        </span>
      ) : null}
    </>
  );

  // Narrowed before destructuring, so each branch keeps only the attributes
  // its element accepts. The unused names are rest siblings the lint config
  // ignores.
  if (props.href !== undefined) {
    const {
      children: _children,
      icon: _icon,
      trailing: _trailing,
      size: _size,
      isActive: _isActive,
      css: _css,
      ...anchorProps
    } = props;
    return (
      <a {...anchorProps} css={chipCss}>
        {content}
      </a>
    );
  }

  const {
    children: _children,
    icon: _icon,
    trailing: _trailing,
    size: _size,
    isActive: _isActive,
    css: _css,
    href: _href,
    type = "button",
    ...buttonProps
  } = props;
  return (
    <button aria-pressed={isActive} {...buttonProps} type={type} css={chipCss}>
      {content}
    </button>
  );
}

const styles = stylex.create({
  // `em` boxes so the icon tracks the chip's font-size across sizes.
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    inlineSize: "1em",
    blockSize: "1em",
    color: "currentColor",
  },
  // A token, not an opacity blend: dimming `accentOn` further on the active
  // chip would drop it below the WCAG 1.4.3 contrast floor.
  trailing: {
    flexShrink: 0,
    color: color.textMuted,
  },
  // On the active fill there's nothing to mute against, so trailing takes the
  // same `accentOn` as the label.
  trailingActive: {
    color: "inherit",
  },
});
