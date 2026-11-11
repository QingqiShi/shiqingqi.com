"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { useOptionCardPress } from "../forms/use-option-card-press.ts";
import { mergeRefs } from "../merge-refs.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { cardSurface } from "./card.stylex.ts";
import { FlowBlock } from "./flow-block.tsx";

interface CardProps extends Omit<ComponentProps<"div">, "className" | "style"> {
  /**
   * Adds hover, focus and press affordances for a card that acts as a clickable
   * control. To make the whole card a link instead, compose `cardSurface` on
   * your own `<Link>`/`<a>` — `Card` always renders a `<div>`.
   *
   * @zh 为作为可点击控件的卡片添加悬停、聚焦与按下态样式。若想让整张卡片本身成为链接，请改在你自己的 `<Link>`/`<a>` 上组合 `cardSurface`——`Card` 始终渲染为 `<div>`。
   */
  interactive?: boolean;
  /**
   * Draws the edge in the colour of an Intent and leaves the rest of the card
   * as it is. `"destructive"` marks a card of actions that cannot be undone, such
   * as a danger zone at the end of a settings page. Say the danger in the
   * card's title too, because a colour alone does not say it.
   *
   * @zh 以意图的颜色绘制卡片边缘，其余部分保持不变。`"destructive"` 标记一张包含无法撤销操作的卡片，例如设置页末尾的危险区。请在卡片标题中也说明危险，因为颜色本身无法表达。
   */
  intent?: "destructive";
  /**
   * The space between the edge and the content. `"md"` suits a card that
   * stands alone. `"sm"` suits a card in a dense screen, such as a dashboard
   * tile. `"none"` suits a card whose content reaches its edge, such as a
   * list or a chart.
   *
   * @zh 边缘与内容之间的间距。`"md"` 适合独立的卡片；`"sm"` 适合密集界面中的卡片，例如仪表盘的小块；`"none"` 适合内容贴边的卡片，例如列表或图表。
   */
  padding?: "none" | "sm" | "md";
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
  intent,
  padding = "md",
  css,
  ref,
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  ...restProps
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const press = useOptionCardPress({
    cardRef,
    disabled: !interactive,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  });
  return (
    <FlowBlock
      {...restProps}
      {...press.handlers}
      surface
      ref={mergeRefs(ref, cardRef)}
      css={[
        stack.item,
        styles.base,
        paddingStyles[padding],
        cardSurface.base,
        interactive && transition.colors,
        interactive && cardSurface.interactive,
        intent && intentStyles[intent],
        css,
      ]}
    >
      {children}
    </FlowBlock>
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
  },
});

const paddingStyles = stylex.create({
  none: { padding: 0 },
  sm: { padding: space._3 },
  md: { padding: space._5 },
});

const intentStyles = stylex.create({
  destructive: {
    borderColor: color.destructive,
  },
});
