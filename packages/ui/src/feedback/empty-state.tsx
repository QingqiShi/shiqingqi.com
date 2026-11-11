import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { Heading } from "../content/heading.tsx";
import { Text } from "../content/text.tsx";
import { isShown } from "../is-shown.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { cluster, stack } from "../primitives/stack.stylex.ts";
import { controlSize, measure, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface EmptyStateProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css" | "title"
> {
  /**
   * An icon on a soft plate above the title, such as the icon of what is
   * missing. It is decoration: the title says what is missing.
   *
   * @zh 标题上方柔和底板上的图标，例如所缺内容的图标。它只是装饰：缺少什么由标题说明。
   */
  icon?: ReactNode;
  /**
   * What is missing, in a few words, such as "No transactions yet".
   *
   * @zh 用几个词说明缺少什么，例如「还没有交易」。
   */
  title: ReactNode;
  /**
   * One or two sentences under the title: why the place is empty, or what
   * fills it.
   *
   * @zh 标题下方的一两句话：说明这里为何为空，或什么会填满它。
   */
  description?: ReactNode;
  /**
   * The action that fills the place, such as a `Button` "Add a transaction",
   * under the text.
   *
   * @zh 填满此处的操作，例如「添加交易」`Button`，位于文字下方。
   */
  action?: ReactNode;
  /**
   * The heading rank of the title, for the outline of the page. Defaults to
   * 3, for an empty state inside a card or a section with an `h2`.
   *
   * @zh 标题的层级，用于页面的大纲结构。默认为 3，适用于位于带 `h2` 的卡片或分区内的空状态。
   */
  level?: 2 | 3 | 4 | 5 | 6;
  /**
   * StyleX styles merged over the empty state's own — the config-layer
   * escape hatch.
   *
   * @zh 合并在空状态自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * What shows where a list or a page has nothing yet: an icon, a short
 * title, a line that says why, and the action that fills it, centred and
 * quiet.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  level = 3,
  css,
  ...rest
}: EmptyStateProps) {
  return (
    <div {...rest} css={[stack.item, styles.root, css]}>
      {isShown(icon) ? (
        <div aria-hidden css={[corner.radius_3, styles.icon]}>
          {icon}
        </div>
      ) : null}
      <div css={[stack.text, styles.text]}>
        <Heading level={level} look="h4" align="center">
          {title}
        </Heading>
        {isShown(description) ? (
          <Text as="p" look="bodySmall" tone="muted" align="center">
            {description}
          </Text>
        ) : null}
      </div>
      {isShown(action) ? (
        <div css={[cluster.tight, styles.action]}>{action}</div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  root: {
    alignItems: "center",
    paddingBlock: space._7,
    paddingInline: space._3,
    textAlign: "center",
  },
  icon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._10,
    blockSize: controlSize._10,
    fontSize: controlSize._6,
    color: color.mutedForeground,
    backgroundColor: color.secondary,
  },
  text: {
    alignItems: "center",
    maxInlineSize: measure.short,
  },
  action: {
    justifyContent: "center",
  },
});
