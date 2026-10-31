"use client";

import * as stylex from "@stylexjs/stylex";
import { createElement, use, useLayoutEffect, type ReactNode } from "react";
import { LIQUID_SEGMENT } from "../effect-layer/liquid-indicator.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { selected } from "../primitives/selected.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { font } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { NAV_ROW } from "./create-nav-list-motion.ts";
import { NavListContext, navListStyles } from "./nav-list-context.tsx";

interface NavLinkProps {
  /**
   * Where the link goes.
   *
   * @zh 链接的目标地址。
   */
  href: string;
  /**
   * Marks the page being read. It sets `aria-current="page"`, and the
   * list's marker moves to the link.
   *
   * @zh 标记当前正在阅读的页面。它设置 `aria-current="page"`，列表的标记随之移到该链接。
   */
  current?: boolean;
  /**
   * An icon at the start of the row, in the muted colour. It takes its size
   * from the row. Give one to each row of a list, or to none, so that the text
   * of the rows starts on one edge.
   *
   * @zh 行首的图标，以弱化颜色显示，尺寸由行决定。一个列表中的各行要么都给图标，要么都不给，使各行文字从同一边缘开始。
   */
  icon?: ReactNode;
  /**
   * The link's name, on one line.
   *
   * @zh 链接的名称，单行显示。
   */
  children: ReactNode;
  /**
   * StyleX styles merged over the link's own.
   *
   * @zh 合并到链接自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * One row of a `NavList`: a link across the row, in the full text colour.
 * The current page takes a semibold weight, and the list's marker moves under
 * it. A hovered row takes the list's lighter hover fill. The fill is the box of the row: it starts on the box edge of
 * the list, and the content starts on the text edge, `navListTokens.rowInset`
 * after it. Under a fine pointer the row is the height of a `sm` control.
 * Under a coarse pointer it is at least 44px tall.
 */
export function NavLink({
  href,
  current = false,
  icon,
  children,
  css,
}: NavLinkProps) {
  const { linkComponent, motion } = use(NavListContext);
  useLayoutEffect(() => {
    motion?.refresh();
  }, [current, motion]);
  // The link component comes from the context and does not change between
  // renders. In JSX, the static-components rule cannot see this, so use
  // createElement.
  return (
    <li css={navListStyles.row}>
      {createElement(
        linkComponent,
        {
          href,
          "aria-current": current ? "page" : undefined,
          ...{ [NAV_ROW]: "", [LIQUID_SEGMENT]: "" },
          ...stylex.props(
            typeRole.label,
            a11y.touchRow,
            transition.colors,
            corner.radius_2,
            navListStyles.rowInset,
            navListStyles.rowControl,
            styles.link,
            selected.quiet,
            a11y.focusRingInset,
            css,
          ),
        },
        icon === undefined ? null : (
          <span css={navListStyles.icon}>{icon}</span>
        ),
        children,
      )}
    </li>
  );
}

const styles = stylex.create({
  link: {
    fontWeight: {
      default: font.weight_4,
      ":is([aria-current=page])": font.weight_6,
    },
  },
});
