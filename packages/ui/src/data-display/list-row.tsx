"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import {
  type AriaAttributes,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  type Ref,
} from "react";
import { useShownCurrent } from "../actions/nav-list-context.tsx";
import { color } from "../color.stylex.ts";
import { mergeRefs } from "../merge-refs.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { quietSurface } from "../primitives/quiet-surface.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { controlSize, font, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { listRowSizes, listRowTokens, listSurface } from "./list.stylex.ts";

/**
 * The contract of the link Slot: `href`, `children`, `className`, `style`,
 * `ref` and the ARIA attributes have to reach the rendered anchor.
 */
export interface ListRowLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
function PlainAnchor(props: ListRowLinkProps) {
  return <a {...props} />;
}

interface ListRowBaseProps {
  /**
   * The row's name, on one line unless the row sets `wrap`.
   *
   * @zh 行的名称，单行显示，除非该行设置了 `wrap`。
   */
  children: ReactNode;
  /**
   * Lets the name and the detail line wrap onto more lines instead of ending
   * in an ellipsis, and breaks a long word such as an e-mail address. Use it
   * where a cut name would hide what the row is about. The value stays on the
   * top line, and the leading item, the trailing item and the caret stay
   * centred on the first two lines, so a long name does not move them down.
   *
   * @zh 让名称与说明行换行显示，而不是以省略号截断，并会断开电子邮件地址这类很长的单词。当截断会让人看不出这一行是什么时使用。value 仍位于首行，前置项、尾随项与箭头仍居中于前两行，因此较长的名称不会把它们往下移。
   */
  wrap?: boolean;
  /**
   * A muted line under the name, such as a summary or a count. A row with a
   * detail line puts its name and its `value` on the top line, and centres
   * its leading item on the name and this line.
   *
   * @zh 名称下方的弱化文字，例如摘要或数量。有说明行时，名称与 `value` 位于首行，前置项居中于名称和这一行。
   */
  detail?: ReactNode;
  /**
   * More lines under the detail line, such as a line of Badges or a note.
   * Each child is a line of its own. They do not move the leading item, which
   * stays level with the name and the detail line.
   *
   * @zh 说明行下方的更多行，例如一行 Badge 或一条备注。每个子元素自成一行。它们不会移动前置项，前置项始终与名称和说明行对齐。
   */
  extra?: ReactNode;
  /**
   * Shown before the name, such as an Avatar, an icon or an emoji.
   *
   * @zh 显示在名称之前，例如 Avatar、图标或表情符号。
   */
  leading?: ReactNode;
  /**
   * Puts `leading` in a square box of this size, so the names of all rows
   * start on one line. A row with a sized leading item is as tall as a row
   * with a detail line, also when it shows only a name, so a list of both
   * keeps one row height. `sm` fits an icon or a small Avatar, `md` an emoji
   * on a plate, `lg` a tile.
   *
   * @zh 将 `leading` 放入此尺寸的方形框内，使各行名称从同一条线开始。前置项有尺寸的行与有说明行的行同高，即使只显示名称也是如此，因此两种行混排时行高一致。`sm` 适合图标或小号 Avatar，`md` 适合带底板的表情符号，`lg` 适合方块。
   */
  leadingSize?: "sm" | "md" | "lg";
  /**
   * Draws a sunken plate of this shape behind `leading`. Without a
   * `leadingSize`, the box is `md`.
   *
   * @zh 在 `leading` 后绘制此形状的凹陷底板。未设置 `leadingSize` 时，框为 `md`。
   */
  leadingShape?: "circle" | "square";
  /**
   * The main figure of the row, such as an amount, at the end of the top
   * line. The values of a list line up at their end.
   *
   * @zh 行的主要数值（例如金额），位于首行末尾。列表中的数值在末端对齐。
   */
  value?: ReactNode;
  /**
   * A muted line under `value`, such as a balance or a converted amount. In
   * a row with a detail line, it shares that line.
   *
   * @zh `value` 下方的弱化文字，例如余额或换算后的金额。有说明行时，它与说明行同在一行。
   */
  valueDetail?: ReactNode;
  /**
   * Shown at the end, before the caret, such as a Badge.
   *
   * @zh 显示在末尾、箭头之前，例如 Badge。
   */
  trailing?: ReactNode;
  /**
   * Buttons after the row, outside the part that opens it, such as "Move up".
   * A row with actions shows no caret.
   *
   * @zh 行之后的按钮，位于打开该行的区域之外，例如「上移」。有操作按钮的行不显示箭头。
   */
  actions?: ReactNode;
  /**
   * Shows the caret that says the row opens something. Defaults to `true`.
   * Turn it off where the row opens beside the list rather than in its place.
   * A `NavigationSplitView` that can stack its sidebar decides this for the
   * rows of its sidebar: they show it only where the sidebar is a page.
   *
   * @zh 显示表示该行可打开内容的箭头，默认为 `true`。当行在列表旁打开、而非替换列表时关闭它。可堆叠侧栏的 `NavigationSplitView` 替其侧栏中的行决定这一点：只有侧栏作为页面时才显示。
   */
  caret?: boolean;
  /**
   * Marks the row that is open. The selected look follows it. In a
   * `NavigationSplitView`, the row of the destination that opens takes this
   * mark at once, and the rows of a sidebar that is a page of the stack do not
   * show it.
   *
   * @zh 标记当前打开的行，选中样式随之变化。在 `NavigationSplitView` 中，正在打开的目标所对应的行会立即获得此标记；侧栏作为堆叠页面时，其中的行不显示标记。
   */
  "aria-current"?: AriaAttributes["aria-current"];
  /**
   * Ref to the link or button.
   *
   * @zh 指向链接或按钮的 ref。
   */
  ref?: Ref<HTMLElement>;
  /**
   * StyleX styles merged over the link's or button's own, such as an indent.
   *
   * @zh 合并在链接或按钮自身样式之上的 StyleX 样式，例如缩进。
   */
  css?: StyleProp;
}

interface ListRowLinkTarget {
  /**
   * Where the row goes. The row renders as a link.
   *
   * @zh 行的目标地址，此时行渲染为链接。
   */
  href: string;
  /**
   * The component that renders the link, such as a router's link. Defaults to
   * a plain `<a>`.
   *
   * @zh 渲染链接的组件，例如路由的链接组件。默认为普通 `<a>`。
   */
  linkComponent?: ComponentType<ListRowLinkProps>;
  onClick?: never;
}

interface ListRowButtonTarget {
  /**
   * What the row does when pressed. The row renders as a button.
   *
   * @zh 按下行时执行的操作，此时行渲染为按钮。
   */
  onClick: () => void;
  /**
   * Makes the button a toggle that is on or off, such as a row that picks a
   * filter. The selected look follows it.
   *
   * @zh 使按钮成为可开可关的切换按钮，例如选择筛选条件的行。选中样式随之变化。
   */
  "aria-pressed"?: boolean;
  href?: never;
  linkComponent?: never;
}

interface ListRowStaticTarget {
  href?: never;
  linkComponent?: never;
  onClick?: never;
}

type ListRowProps = ListRowBaseProps &
  (ListRowLinkTarget | ListRowButtonTarget | ListRowStaticTarget);

/**
 * One row of a `List`: a link or a button across the whole row, at least
 * 48px tall, with a name, optional detail lines, slots at both ends, and a
 * caret that says it opens something. A row of only a name centres every
 * part. A row with a detail line puts the name and the value on the top line
 * and centres the leading item on the first two lines. `wrap` lets the name
 * and the detail line wrap, for a name that must show in full. A row with neither
 * `href` nor `onClick` opens nothing and shows no caret, for an item among
 * rows that do, such as a ledger line that only reads.
 */
export function ListRow({
  children,
  wrap = false,
  detail,
  extra,
  leading,
  leadingSize,
  leadingShape,
  value,
  valueDetail,
  trailing,
  actions,
  caret = true,
  "aria-current": ariaCurrent,
  ref,
  css,
  ...target
}: ListRowProps) {
  const isStatic = target.href === undefined && target.onClick === undefined;
  const isCurrent = useShownCurrent(
    target.href,
    ariaCurrent !== undefined && ariaCurrent !== false,
  );
  const shownCurrent = isCurrent ? (ariaCurrent ?? "page") : undefined;
  const hasDetail = isShown(detail) || isShown(extra);
  const hasValueDetail = isShown(valueDetail);
  const mediaSize = leadingSize ?? (leadingShape ? "md" : undefined);
  const valueText = isShown(value) ? (
    <span
      css={[
        typeRole.body,
        typeModifier.numeric,
        styles.value,
        hasDetail && styles.valueCell,
      ]}
    >
      {value}
    </span>
  ) : null;
  const valueDetailText = hasValueDetail ? (
    <span
      css={[
        typeRole.caption,
        typeModifier.numeric,
        styles.valueDetail,
        hasDetail && styles.valueDetailCell,
      ]}
    >
      {valueDetail}
    </span>
  ) : null;
  const body = (
    <>
      {isShown(leading) ? (
        <span
          css={[
            styles.side,
            wrap && styles.onHead,
            styles.leading,
            mediaSize && styles.leadingMedia,
          ]}
        >
          {mediaSize ? (
            <span
              css={[
                styles.media,
                mediaStyles[mediaSize],
                leadingShape === "circle" && corner.radius_round,
                leadingShape === "square" && corner.radius_2,
                leadingShape && styles.plate,
              ]}
            >
              {leading}
            </span>
          ) : (
            leading
          )}
        </span>
      ) : null}
      <span
        css={[
          typeRole.body,
          wrap ? styles.wrap : truncate.base,
          styles.title,
          hasDetail ? styles.titleCell : styles.acrossHead,
        ]}
      >
        {children}
      </span>
      {hasDetail ? (
        <>
          {valueText}
          {isShown(detail) ? (
            <span
              css={[
                typeRole.bodySmall,
                wrap ? styles.wrap : truncate.base,
                styles.detail,
                !hasValueDetail && styles.detailUnderValue,
              ]}
            >
              {detail}
            </span>
          ) : null}
          {valueDetailText}
          {isShown(extra) ? (
            <span
              css={[
                typeRole.caption,
                styles.extra,
                !isShown(detail) && styles.extraAsDetail,
                !isShown(detail) && hasValueDetail && styles.extraBesideValue,
              ]}
            >
              {extra}
            </span>
          ) : null}
        </>
      ) : valueText || valueDetailText ? (
        <span css={[styles.values, styles.acrossHead, wrap && styles.onHead]}>
          {valueText}
          {valueDetailText}
        </span>
      ) : null}
      {isShown(trailing) ? (
        <span css={[styles.side, wrap && styles.onHead, styles.trailing]}>
          {trailing}
        </span>
      ) : null}
      {caret && !actions && !isStatic ? (
        <span
          aria-hidden
          css={[styles.side, wrap && styles.onHead, styles.caret]}
        >
          <CaretRightIcon weight="bold" />
        </span>
      ) : null}
    </>
  );
  const setRef = mergeRefs(ref);
  const look = [
    listSurface.row,
    styles.row,
    mediaSize && listSurface.withMedia,
    css,
  ];

  return (
    <li css={listSurface.item}>
      {target.href !== undefined ? (
        <LinkSlot
          href={target.href}
          component={target.linkComponent}
          ref={setRef}
          aria-current={shownCurrent}
          look={[quietSurface.interactive, look]}
        >
          {body}
        </LinkSlot>
      ) : target.onClick !== undefined ? (
        <button
          type="button"
          ref={setRef}
          aria-current={ariaCurrent}
          aria-pressed={target["aria-pressed"]}
          onClick={target.onClick}
          css={[buttonReset.base, quietSurface.interactive, look]}
        >
          {body}
        </button>
      ) : (
        <div ref={setRef} css={look}>
          {body}
        </div>
      )}
      {actions ? <span css={styles.actions}>{actions}</span> : null}
    </li>
  );
}

function isShown(node: ReactNode) {
  return node !== undefined && node !== null && node !== false && node !== "";
}

function LinkSlot({
  component: LinkComponent = PlainAnchor,
  look,
  ...props
}: Omit<ListRowLinkProps, "className" | "style"> & {
  component: ComponentType<ListRowLinkProps> | undefined;
  look: StyleProp;
}) {
  return <LinkComponent {...props} {...stylex.props(look)} />;
}

// The row is a grid of five columns: leading, name, values, trailing and
// caret. Row 1 holds the name and the value, row 2 the detail line, row 3 the
// extra lines. The leading item, the trailing item and the caret span rows 1
// and 2, so they centre on the lines that are there and not on a calculated
// height. When the name or the detail line wraps, rows 1 and 2 grow. Then
// `onHead` holds those items in a box as tall as one name line and one detail
// line at the top, so they stay level with the first two lines.
const headLines = `calc(${listRowTokens.titleSize} * ${font.lineHeightBody} + ${listRowTokens.detailSize} * ${listRowTokens.detailLineHeight})`;

const styles = stylex.create({
  row: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto auto",
    alignContent: "center",
    rowGap: 0,
    columnGap: 0,
    color: color.fg,
    textAlign: "start",
  },
  side: {
    gridRow: "1 / 3",
    alignSelf: "center",
    display: "flex",
    alignItems: "center",
  },
  acrossHead: {
    gridRow: "1 / 3",
    alignSelf: "center",
  },
  onHead: {
    alignSelf: "stretch",
    justifyContent: "center",
    maxBlockSize: headLines,
  },
  wrap: {
    overflowWrap: "anywhere",
  },
  leading: {
    gridColumn: 1,
    marginInlineEnd: rhythm.tight,
  },
  leadingMedia: {
    marginInlineEnd: rhythm.item,
  },
  title: {
    gridColumn: 2,
    minInlineSize: 0,
    fontSize: listRowTokens.titleSize,
    fontWeight: font.weight_5,
  },
  titleCell: {
    gridRow: 1,
    alignSelf: "baseline",
  },
  detail: {
    gridColumn: 2,
    gridRow: 2,
    alignSelf: "baseline",
    minInlineSize: 0,
    fontSize: listRowTokens.detailSize,
    lineHeight: listRowTokens.detailLineHeight,
    color: color.fgMuted,
  },
  detailUnderValue: {
    gridColumn: "2 / 4",
  },
  extra: {
    gridColumn: "2 / 4",
    gridRow: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minInlineSize: 0,
    color: color.fgMuted,
  },
  // Without a detail line, the extra lines move up to its row, so that no
  // empty line shows under the name.
  extraAsDetail: {
    gridRow: 2,
    alignSelf: "baseline",
  },
  extraBesideValue: {
    gridColumn: 2,
  },
  values: {
    gridColumn: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    marginInlineStart: rhythm.tight,
  },
  value: {
    whiteSpace: "nowrap",
    fontSize: listRowTokens.titleSize,
    fontWeight: font.weight_5,
  },
  valueCell: {
    gridColumn: 3,
    gridRow: 1,
    alignSelf: "baseline",
    justifySelf: "end",
    marginInlineStart: rhythm.tight,
  },
  valueDetail: {
    whiteSpace: "nowrap",
    color: color.fgMuted,
  },
  valueDetailCell: {
    gridColumn: 3,
    gridRow: 2,
    alignSelf: "baseline",
    justifySelf: "end",
    marginInlineStart: rhythm.tight,
  },
  trailing: {
    gridColumn: 4,
    marginInlineStart: rhythm.tight,
  },
  media: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  plate: {
    backgroundColor: color.bgSurfaceSunken,
  },
  caret: {
    display: listRowTokens.caretDisplay,
    gridColumn: 5,
    marginInlineStart: rhythm.tight,
    color: color.fgMuted,
  },
  // The actions are outside the row grid, so they cannot span its lines.
  // They fill the height of the row up to a name line and a detail line with
  // the row padding, and centre in it.
  actions: {
    alignSelf: "stretch",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: rhythm.inline,
    maxBlockSize: `calc(${space._1} * 2 + ${headLines})`,
    paddingInlineStart: rhythm.tight,
    paddingInlineEnd: space._2,
  },
});

const mediaStyles = stylex.create({
  sm: {
    inlineSize: listRowSizes.media_sm,
    blockSize: listRowSizes.media_sm,
    fontSize: controlSize._4,
  },
  md: {
    inlineSize: listRowSizes.media_md,
    blockSize: listRowSizes.media_md,
    fontSize: controlSize._5,
  },
  lg: {
    inlineSize: listRowSizes.media_lg,
    blockSize: listRowSizes.media_lg,
    fontSize: controlSize._6,
  },
});
