import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { isShown } from "../is-shown.ts";
import { cluster, stack } from "../primitives/stack.stylex.ts";
import type { StyleProp } from "../types.ts";
import { Heading } from "./heading.tsx";
import { Text } from "./text.tsx";

interface PageHeaderProps extends Omit<
  ComponentProps<"header">,
  "children" | "className" | "style" | "css" | "title"
> {
  /**
   * The page's title, rendered as its `<h1>`.
   *
   * @zh 页面标题，渲染为页面的 `<h1>`。
   */
  title: ReactNode;
  /**
   * One or two sentences under the title that say what the page is for, in
   * muted text.
   *
   * @zh 标题下方的一两句话，以弱化文字说明页面的用途。
   */
  description?: ReactNode;
  /**
   * A short muted line above the title, such as a date or where the page
   * sits.
   *
   * @zh 标题上方的一行简短弱化文字，例如日期或页面所在的位置。
   */
  eyebrow?: ReactNode;
  /**
   * The page's own actions, such as an "Add" button or a month switcher, at
   * the end of the header. Where the header is too narrow for the title and
   * the actions side by side, they move under the title.
   *
   * @zh 页面自身的操作，例如「添加」按钮或月份切换器，位于标题区末尾。标题区宽度不足以让标题与操作并排时，操作移到标题下方。
   */
  actions?: ReactNode;
  /**
   * StyleX styles merged over the header's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在标题区自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * The top of a page: an optional eyebrow, the `<h1>`, a description, and
 * the page's actions at the end.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  css,
  ...rest
}: PageHeaderProps) {
  return (
    <header {...rest} css={[cluster.item, css]}>
      <div css={[stack.tight, styles.text]}>
        {isShown(eyebrow) ? (
          <Text as="p" look="overline" tone="muted">
            {eyebrow}
          </Text>
        ) : null}
        <Heading level={1} look="h1">
          {title}
        </Heading>
        {isShown(description) ? (
          <Text as="p" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {isShown(actions) ? (
        <div css={[cluster.tight, styles.actions]}>{actions}</div>
      ) : null}
    </header>
  );
}

const styles = stylex.create({
  // Below this width, the actions wrap under the title, so a long title is
  // not squeezed beside them.
  text: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "20rem",
    minInlineSize: 0,
  },
  actions: {
    flexShrink: 0,
  },
});
