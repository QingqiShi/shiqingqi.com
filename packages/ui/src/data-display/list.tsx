import type { StyleXStyles } from "@stylexjs/stylex";
import type { CSSProperties } from "@stylexjs/stylex/lib/types/StyleXTypes";
import type { ComponentProps, ReactNode } from "react";
import { cardSurface } from "../surfaces/card.stylex.ts";
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
 * divider between rows. Every such list takes this look, so a row that can be
 * tapped looks the same on every screen.
 */
export function List({ children, css, ...rest }: ListProps) {
  return (
    <ul {...rest} css={[cardSurface.base, listSurface.list, css]}>
      {children}
    </ul>
  );
}
