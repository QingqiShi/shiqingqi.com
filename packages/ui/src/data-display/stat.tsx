import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { isShown } from "../is-shown.ts";
import { containerWidth } from "../primitives/size-container.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { toneColor } from "../primitives/tone.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { border, controlSize, rhythm, shadow } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { statTokens } from "./stat.stylex.ts";

interface StatProps extends Omit<
  ComponentProps<"dl">,
  "children" | "className" | "style" | "css"
> {
  /**
   * What the figure counts, in small muted text above it, such as "Spent".
   *
   * @zh 数值所统计的内容，以小号弱化文字显示在数值上方，例如「支出」。
   */
  label: ReactNode;
  /**
   * The figure itself, such as "£2,184.20": the largest text of the stat,
   * in figures of one width.
   *
   * @zh 数值本身，例如「£2,184.20」：统计项中最大的文字，数字等宽。
   */
  value: ReactNode;
  /**
   * A muted line under the figure that gives it a context, such as
   * "£312 less than October".
   *
   * @zh 数值下方的一行弱化文字，为数值提供背景，例如「比十月少 £312」。
   */
  detail?: ReactNode;
  /**
   * A small icon at the end of the label's line. It is decoration: the label
   * says what the stat is.
   *
   * @zh 标签所在行末尾的小图标。它只是装饰：统计项是什么由标签说明。
   */
  icon?: ReactNode;
  /**
   * Colours the figure by what it means: `success` for a good result such as
   * money in, `danger` for a loss or a fault, `warning` for something that
   * needs attention, `info` for a neutral note. Defaults to `default`, the
   * text colour. Say the meaning in the label or the detail too, as colour
   * alone does not reach everyone.
   *
   * @zh 按含义为数值着色：`success` 表示好的结果，例如收入；`danger` 表示亏损或故障；`warning` 表示需要注意的事；`info` 表示中性的提示。默认为 `default`，即正文颜色。同时也要在标签或说明中写明含义，因为仅靠颜色并不能传达给所有人。
   */
  intent?: "default" | "success" | "warning" | "danger" | "info";
  /**
   * StyleX styles merged over the stat's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在统计项自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * One key figure: a small label, the figure in large type, and a muted
 * detail line. In a `StatGroup` with the `cards` look, each stat sits on a
 * card. It renders a `<dl>`, so a screen reader reads the label with the
 * figure.
 */
export function Stat({
  label,
  value,
  detail,
  icon,
  intent = "default",
  css,
  ...rest
}: StatProps) {
  return (
    <dl
      {...rest}
      css={[stack.tight, styles.stat, styles.inGroup, styles.onCard, css]}
    >
      <dt css={[typeRole.label, styles.labelLine]}>
        <span css={styles.label}>{label}</span>
        {isShown(icon) ? (
          <span aria-hidden css={styles.icon}>
            {icon}
          </span>
        ) : null}
      </dt>
      <dd
        css={[
          typeRole.h1,
          typeModifier.numeric,
          styles.value,
          toneColor[intent],
        ]}
      >
        {value}
      </dd>
      {isShown(detail) ? (
        <dd css={[typeRole.caption, styles.detail]}>{detail}</dd>
      ) : null}
    </dl>
  );
}

/** `StatGroup` sets its `look` on the grid that holds the stats. */
const ON_CARD = ":is([data-stat-look=cards] > *)";
const IN_GROUP_LAST_ODD = ":is([data-stat-look] > :last-child:nth-child(odd))";

const styles = stylex.create({
  stat: {
    minInlineSize: 0,
    margin: 0,
  },
  // A last stat alone in its row takes the whole row, so no gap is left
  // beside it.
  inGroup: {
    gridColumn: {
      default: null,
      [IN_GROUP_LAST_ODD]: {
        default: null,
        [containerWidth.statsInPairs]: "1 / -1",
      },
    },
  },
  // The skin of `cardSurface.base`, which a stat takes only in a group with
  // the `cards` look, so it cannot compose that style.
  onCard: {
    boxSizing: "border-box",
    padding: { default: null, [ON_CARD]: statTokens.cardPadding },
    borderWidth: { default: null, [ON_CARD]: border.size_1 },
    borderStyle: { default: null, [ON_CARD]: "solid" },
    borderColor: { default: null, [ON_CARD]: color.border },
    borderRadius: { default: null, [ON_CARD]: border.radius_3 },
    cornerShape: { default: null, [ON_CARD]: "squircle" },
    backgroundColor: { default: null, [ON_CARD]: color.bgSurface },
    boxShadow: { default: null, [ON_CARD]: shadow._1 },
  },
  labelLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    color: color.fgMuted,
  },
  label: {
    minInlineSize: 0,
  },
  icon: {
    display: "flex",
    flexShrink: 0,
    fontSize: controlSize._4,
  },
  value: {
    margin: 0,
    fontSize: statTokens.valueSize,
    textWrap: "nowrap",
  },
  detail: {
    margin: 0,
    color: color.fgMuted,
  },
});
export { StatGroup } from "./stat-group.tsx";
