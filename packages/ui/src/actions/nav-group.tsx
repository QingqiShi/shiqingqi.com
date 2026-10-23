"use client";

import * as stylex from "@stylexjs/stylex";
import { use, useId, type ReactNode } from "react";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { color, font, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { NavListContext, navListStyles } from "./nav-list-context.tsx";

interface NavGroupProps {
  /**
   * The group's name, above its links. It names the group for a screen
   * reader too. A group in a `NavList` shows it as an overline; a group in
   * another group, as a muted caption. Without one, the group only sets its
   * links apart from the next group.
   *
   * @zh 分组的名称，显示在其链接上方，同时为读屏软件命名该分组。直接位于 `NavList` 中的分组以上标文字显示；位于另一分组中的分组以弱化的说明文字显示。没有名称时，分组只把其链接与下一组分开。
   */
  label?: ReactNode;
  /**
   * The rows: each a `NavLink`, or a `NavGroup` one level down.
   *
   * @zh 各行：每行是一个 `NavLink`，或下一级的 `NavGroup`。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the group's own.
   *
   * @zh 合并到分组自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * Links in a `NavList` that belong together, under an optional label. A group
 * nests one level, and it sets the space between groups.
 */
export function NavGroup({ label, children, css }: NavGroupProps) {
  const parent = use(NavListContext);
  const labelId = useId();
  const outer = !parent.nested;
  const labelled = label != null;

  const rows = (
    <NavListContext value={{ ...parent, nested: true, labelled }}>
      <ul css={stack.rows}>{children}</ul>
    </NavListContext>
  );

  return (
    <li
      css={[
        outer
          ? styles.outer
          : parent.labelled && labelled
            ? styles.innerUnderLabel
            : styles.inner,
        css,
      ]}
    >
      {labelled ? (
        <div role="group" aria-labelledby={labelId}>
          <span
            id={labelId}
            css={[
              outer ? typeRole.overline : typeRole.caption,
              navListStyles.rowInset,
              styles.label,
              outer ? styles.outerLabel : styles.innerLabel,
            ]}
          >
            {label}
          </span>
          {rows}
        </div>
      ) : (
        rows
      )}
    </li>
  );
}

const styles = stylex.create({
  outer: {
    marginBlockStart: { default: rhythm.group, ":first-child": 0 },
  },
  inner: {
    marginBlockStart: { default: rhythm.item, ":first-child": 0 },
  },
  innerUnderLabel: {
    marginBlockStart: rhythm.item,
  },
  label: {
    display: "block",
  },
  outerLabel: {
    color: color.fg,
  },
  innerLabel: {
    fontWeight: font.weight_6,
    color: color.fgMuted,
  },
});
