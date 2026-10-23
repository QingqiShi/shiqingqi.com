"use client";

import * as stylex from "@stylexjs/stylex";
import { createElement, use, type ReactNode } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { selected, selectedTokens } from "../primitives/selected.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { color, controlSize, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
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
   * selected look follows it.
   *
   * @zh 标记当前正在阅读的页面。它设置 `aria-current="page"`，选中样式随之变化。
   */
  current?: boolean;
  /**
   * Shown before the name, such as an icon. It takes its size from the link.
   *
   * @zh 显示在名称之前，例如图标。其尺寸由链接决定。
   */
  leading?: ReactNode;
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
 * One row of a `NavList`: a link across the row, muted until it is hovered
 * or current, with a pill behind the current page. It pads itself, and that
 * padding is the space to the next row. Under a coarse pointer the row is at
 * least 44px tall.
 */
export function NavLink({
  href,
  current = false,
  leading,
  children,
  css,
}: NavLinkProps) {
  const { linkComponent } = use(NavListContext);
  // The link component comes from the context and does not change between
  // renders. In JSX, the static-components rule cannot see this, so use
  // createElement.
  return (
    <li>
      {createElement(
        linkComponent,
        {
          href,
          "aria-current": current ? "page" : undefined,
          ...stylex.props(
            typeRole.label,
            a11y.touchRow,
            transition.colors,
            corner.radius_round,
            navListStyles.rowInset,
            styles.link,
            selected.quiet,
            a11y.focusRingInset,
            css,
          ),
        },
        leading === undefined ? null : (
          <span css={styles.leading}>{leading}</span>
        ),
        children,
      )}
    </li>
  );
}

const styles = stylex.create({
  link: {
    display: "flex",
    alignItems: "center",
    paddingBlock: space._1,
    [selectedTokens.rest]: {
      default: "transparent",
      ":active": color.bgControlPressed,
    },
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
      ":is([aria-current=page])": color.fg,
    },
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  leading: {
    display: "inline-flex",
    flexShrink: 0,
    marginInlineEnd: rhythm.tight,
    fontSize: controlSize._4,
  },
});
