import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { Heading } from "../content/heading.tsx";
import { Text } from "../content/text.tsx";
import { isShown } from "../is-shown.ts";
import { cluster, stack } from "../primitives/stack.stylex.ts";
import { controlHeight, font, latinType, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

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
   * How large the header reads. `"md"`, the default, is for a page that a
   * reader comes to read. `"sm"` makes the title and the description one step
   * smaller, for a screen of an app where the content below is what the
   * visitor came for. Its description takes the full width, under the title
   * and the actions.
   *
   * @default "md"
   * @zh 标题区的大小。默认的 `"md"` 用于读者前来阅读的页面。`"sm"` 让标题与说明各小一级，用于应用中的屏幕：访客是为下方的内容而来。此时说明在标题与操作的下方，占满整行。
   */
  size?: "sm" | "md";
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
  size = "md",
  css,
  ...rest
}: PageHeaderProps) {
  const hasActions = isShown(actions);
  const eyebrowLine = isShown(eyebrow) ? (
    <Text as="p" look="overline" tone="muted">
      {eyebrow}
    </Text>
  ) : null;

  if (size === "sm") {
    return (
      <header {...rest} css={[stack.text, css]}>
        <div css={cluster.item}>
          <div css={[stack.text, styles.text, styles.textSm]}>
            {eyebrowLine}
            <Heading level={1} look="h3">
              {title}
            </Heading>
          </div>
          {hasActions ? (
            <div css={[cluster.tight, styles.actions, styles.actionsSm]}>
              {actions}
            </div>
          ) : null}
        </div>
        {isShown(description) ? (
          <Text
            as="p"
            look="bodySmall"
            tone="muted"
            css={hasActions && styles.descriptionUnderActions}
          >
            {description}
          </Text>
        ) : null}
      </header>
    );
  }

  return (
    <header {...rest} css={[cluster.item, css]}>
      <div css={[stack.tight, styles.text, styles.textMd]}>
        {eyebrowLine}
        <Heading level={1} look="h1">
          {title}
        </Heading>
        {isShown(description) ? (
          <Text as="p" look="body" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {hasActions ? (
        <div css={[cluster.tight, styles.actions]}>{actions}</div>
      ) : null}
    </header>
  );
}

// How far a control of the `sm` height comes out of the line of the small
// title, on each side.
const smActionsOverhang = `max(0px, calc((${controlHeight.sm} - ${font.uiHeading3} * ${latinType.lineHeightHeading}) / 2))`;

const styles = stylex.create({
  text: {
    flexGrow: 1,
    flexShrink: 1,
    minInlineSize: 0,
  },
  // Below this width, the actions wrap under the title, so a long title is
  // not squeezed beside them.
  textMd: {
    flexBasis: "20rem",
  },
  // A small title needs less room, so one button stays beside it on a phone.
  textSm: {
    flexBasis: "12rem",
  },
  actions: {
    flexShrink: 0,
  },
  // The actions overhang the line of the small title, so that the title is on
  // the first line of the screen, as the title of a screen with no actions is.
  actionsSm: {
    marginBlock: `calc(-1 * ${smActionsOverhang})`,
  },
  // The small title and its description are lines of one item, so no gap
  // separates them. But the actions overhang the line of the title, so the
  // description starts below them.
  descriptionUnderActions: {
    marginBlockStart: `calc(${rhythm.tight} + ${smActionsOverhang})`,
  },
});
