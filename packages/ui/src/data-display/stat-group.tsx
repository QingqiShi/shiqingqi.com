import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import {
  containerWidth,
  sizeContainer,
} from "../primitives/size-container.stylex.ts";
import { font, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { statTokens } from "./stat.stylex.ts";

interface StatGroupProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The stats, each a `Stat`.
   *
   * @zh 各统计项，每项是一个 `Stat`。
   */
  children: ReactNode;
  /**
   * `cards` puts each stat on a card of its own. `plain` sets the stats on
   * the surface around them, with more space between them, such as inside a
   * card or under a page's headline. Defaults to `cards`.
   *
   * @zh `cards` 把每个统计项放在各自的卡片上。`plain` 把统计项直接放在周围的表面上，彼此间距更大，例如放在卡片内或页面主标题下方。默认为 `cards`。
   */
  look?: "cards" | "plain";
  /**
   * StyleX styles merged over the group's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在统计组自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A row of `Stat`s that fits as many columns as its own width holds, each at
 * least 8rem wide (10rem in a wide group), and wraps the rest. The stats
 * share the row equally. In a narrow group, such as on a phone, two stats
 * share a row with a smaller figure, and a last stat alone in its row takes
 * the whole row.
 */
export function StatGroup({
  children,
  look = "cards",
  css,
  ...rest
}: StatGroupProps) {
  return (
    <div {...rest} css={[sizeContainer.inline, css]}>
      <div
        data-stat-look={look}
        css={[styles.grid, look === "plain" && styles.plain]}
      >
        {children}
      </div>
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(auto-fit, minmax(min(100%, 8rem), 1fr))",
      [containerWidth.statsInPairs]: "repeat(2, minmax(0, 1fr))",
      [containerWidth.statsWide]: "repeat(auto-fit, minmax(10rem, 1fr))",
    },
    gap: rhythm.item,
    // The defaults of `statTokens` are the sizes of a wide group. A plain
    // value here would win over the query, as StyleX puts it outside its
    // cascade layers.
    [statTokens.valueSize]: {
      default: null,
      [containerWidth.statsBelowWide]: font.uiHeading2,
    },
    [statTokens.cardPadding]: {
      default: null,
      [containerWidth.statsBelowWide]: space._3,
    },
  },
  plain: {
    columnGap: rhythm.group,
  },
});
