import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "@stylexjs/stylex/lib/types/StyleXTypes";
import type { ComponentProps, ReactNode } from "react";
import { plainList } from "../primitives/layout.stylex.ts";
import { cardSurface } from "../surfaces/card.stylex.ts";
import { FlowBlock } from "../surfaces/flow-block.tsx";
import { listSurface } from "./list.stylex.ts";

interface ListProps extends Omit<
  ComponentProps<"ul">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The rows, each a `ListRow`.
   *
   * @zh 各行，每行是一个 `ListRow`。
   */
  children: ReactNode;
  /**
   * `card` puts the rows on a bordered surface with a divider between them.
   * `plain` is for rows inside a card or a section that has its own surface:
   * no dividers, and each row shows a rounded plate under the pointer. The
   * plain list reaches into the gutter by the plate's padding, so the text of
   * its rows lines up with the text around it. Defaults to `card`.
   *
   * @zh `card` 把各行放在带边框的表面上，行与行之间有分隔线。`plain` 用于已有自身表面的卡片或分区中的行：没有分隔线，指针悬停时每行显示一块圆角底板。plain 列表向两侧伸出与底板内边距相同的距离，使各行文字与列表周围的文字对齐。默认为 `card`。
   */
  form?: "card" | "plain";
  /**
   * `compact` sets the rows in smaller type, for a dense list such as the
   * sidebar of a `NavigationSplitView`: the name in body-small, the detail
   * line in caption. The rows keep their alignment and their height of at
   * least 48px. Defaults to `regular`.
   *
   * @zh `compact` 以更小的字号显示各行，用于密集列表，例如 `NavigationSplitView` 的侧栏：名称使用 bodySmall，说明行使用 caption。各行的对齐方式不变，行高仍至少为 48px。默认为 `regular`。
   */
  density?: "regular" | "compact";
  /**
   * StyleX styles that size and place the list, such as a `maxInlineSize` or
   * a margin. Only those properties type-check: a `gap`, `padding`, `border`
   * or `display` on the list would break the rows apart, so it takes none.
   *
   * @zh 设定列表尺寸与位置的 StyleX 样式，例如 `maxInlineSize` 或外边距。只有这类属性能通过类型检查：列表上的 `gap`、`padding`、`border` 或 `display` 会把各行拆开，因此不接受。
   */
  css?: StyleXStyles<
    Pick<
      CSSProperties,
      | "inlineSize"
      | "minInlineSize"
      | "maxInlineSize"
      | "alignSelf"
      | "justifySelf"
      | "flexGrow"
      | "flexShrink"
      | "flexBasis"
      | "gridColumn"
      | "gridRow"
      | "gridArea"
      | "marginBlockStart"
      | "marginBlockEnd"
      | "marginInlineStart"
      | "marginInlineEnd"
    >
  >;
}

/**
 * A list of rows that each open something, on a bordered surface with a
 * divider between rows, or plain inside a surface that is already there.
 * Every such list takes one of these looks, so a row that can be tapped looks
 * the same on every screen.
 */
export function List({
  children,
  form = "card",
  density = "regular",
  css,
  ...rest
}: ListProps) {
  return (
    <FlowBlock
      surface={form === "card"}
      css={[
        form === "card"
          ? [cardSurface.base, listSurface.list]
          : [plainList.list, listSurface.plain],
        density === "compact" && listSurface.compact,
        css,
      ]}
    >
      <ul {...rest} css={listSurface.rows}>
        {children}
      </ul>
    </FlowBlock>
  );
}
