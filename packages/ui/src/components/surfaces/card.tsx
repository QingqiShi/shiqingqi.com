import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { transition } from "../../primitives/motion.stylex.ts";
import { space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { cardSurface } from "./card.stylex.ts";

interface CardProps extends Omit<ComponentProps<"div">, "className" | "style"> {
  /**
   * Adds hover and focus affordances for a card that acts as a clickable
   * control. To make the whole card a link instead, compose `cardSurface` on
   * your own `<Link>`/`<a>` — `Card` always renders a `<div>`.
   *
   * @zh 为作为可点击控件的卡片添加悬停与聚焦态样式。若想让整张卡片本身成为链接，请改在你自己的 `<Link>`/`<a>` 上组合 `cardSurface`——`Card` 始终渲染为 `<div>`。
   */
  interactive?: boolean;
  /**
   * Card contents.
   *
   * @zh 卡片内容。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the card's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在卡片自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * The system's bordered-surface container: a 1px neutral border, rounded
 * corners, and a raised surface background.
 * Forwards native `<div>` attributes and `ref`; `css` composes last, so a
 * caller can override anything, including the padding.
 */
export function Card({
  interactive = false,
  css,
  ref,
  children,
  ...restProps
}: CardProps) {
  return (
    <div
      {...restProps}
      ref={ref}
      css={[
        styles.base,
        cardSurface.base,
        interactive && transition.colors,
        interactive && cardSurface.interactive,
        css,
      ]}
    >
      {children}
    </div>
  );
}

export { CardHeader } from "./card-header.tsx";
export { CardTitle } from "./card-title.tsx";
export { CardDescription } from "./card-description.tsx";
export { CardContent } from "./card-content.tsx";
export { CardFooter } from "./card-footer.tsx";

const styles = stylex.create({
  base: {
    boxSizing: "border-box",
    paddingBlock: space._3,
    paddingInline: space._4,
  },
});
