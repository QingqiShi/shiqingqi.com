import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { stack } from "../primitives/stack.stylex.ts";
import { border, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { settingRowTokens } from "./setting-row.stylex.ts";

interface SettingListProps extends Omit<
  ComponentProps<"div">,
  "children" | "className" | "style" | "css"
> {
  /**
   * The rows, each a `SettingRow`.
   *
   * @zh 各行，每行是一个 `SettingRow`。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the list's own — the config-layer escape
   * hatch.
   *
   * @zh 合并在列表自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * A run of `SettingRow`s with a divider between them, for the settings of
 * one card or one section. The first row starts at the top of the list and
 * the last ends at its bottom, so the list sits in a `Card` like any other
 * content.
 */
export function SettingList({ children, css, ...rest }: SettingListProps) {
  return (
    <div {...rest} css={[stack.text, styles.list, css]}>
      {children}
    </div>
  );
}

const styles = stylex.create({
  list: {
    minInlineSize: 0,
    [settingRowTokens.divider]: border.size_1,
    [settingRowTokens.paddingBlock]: space._3,
  },
});
