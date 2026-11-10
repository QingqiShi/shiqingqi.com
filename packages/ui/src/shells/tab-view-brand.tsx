import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { Text } from "../content/text.tsx";
import { Avatar } from "../data-display/avatar.tsx";
import { truncate } from "../primitives/layout.stylex.ts";
import { row } from "../primitives/stack.stylex.ts";
import type { StyleProp } from "../types.ts";
import { tabViewForm } from "./tab-view.stylex.ts";

interface TabViewBrandProps {
  /**
   * The app's name, beside the mark in the labelled sidebar.
   *
   * @zh 应用名称，在带标签的侧边栏中显示在标志旁边。
   */
  name: string;
  /**
   * A muted line under the name, such as the household or the account the
   * app shows.
   *
   * @zh 名称下方的弱化文字，例如应用所显示的家庭或账户。
   */
  detail?: ReactNode;
  /**
   * The app's mark. Defaults to a square solid `Avatar` of `name`; pass
   * `initials` to choose its letters, or a node of your own, such as a logo.
   * It is decorative, as the name says what it is.
   *
   * @zh 应用标志。默认为以 `name` 生成的方形实心 `Avatar`；可传入 `initials` 选择其字母，或传入自己的节点，例如标志图片。它是装饰性的，名称已说明其含义。
   */
  mark?: ReactNode;
  /**
   * The letters of the default mark, such as `"Qi"`. Defaults to the
   * initials of `name`.
   *
   * @zh 默认标志中的字母，例如 `"Qi"`。默认取 `name` 的首字母。
   */
  initials?: string;
  /**
   * StyleX styles merged over the root, composed last.
   *
   * @zh 合并在根元素之上的 StyleX 样式，最后合成。
   */
  css?: StyleProp;
}

/**
 * The app's mark, name and an optional detail line, for the `header` of a
 * `TabView`. The icon rail shows only the mark, and the labelled sidebar
 * shows all three.
 */
export function TabViewBrand({
  name,
  detail,
  mark,
  initials,
  css,
}: TabViewBrandProps) {
  return (
    <span css={[row.tight, styles.root, css]}>
      <span aria-hidden css={styles.mark}>
        {mark ?? (
          <Avatar name={name} initials={initials} shape="square" look="solid" />
        )}
      </span>
      <span css={styles.text}>
        <Text
          as="span"
          look="label"
          weight="semibold"
          css={[truncate.base, styles.line]}
        >
          {name}
        </Text>
        {detail ? (
          <Text
            as="span"
            look="caption"
            tone="muted"
            css={[truncate.base, styles.line]}
          >
            {detail}
          </Text>
        ) : null}
      </span>
    </span>
  );
}

const styles = stylex.create({
  root: {
    minInlineSize: 0,
  },
  mark: {
    display: "flex",
    flexShrink: 0,
  },
  // The text shows only where the rail shows labels, as `TabViewLabelsOnly`.
  text: {
    display: tabViewForm.labels,
    minInlineSize: 0,
  },
  line: {
    display: "block",
  },
});
