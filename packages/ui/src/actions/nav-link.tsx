"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { createElement, use, useLayoutEffect, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { quietSurface } from "../primitives/quiet-surface.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { FlowBlock } from "../surfaces/flow-block.tsx";
import { font } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { NAV_ROW } from "./create-nav-list-motion.ts";
import {
  NavIcon,
  NavListContext,
  navListStyles,
  useShownCurrent,
} from "./nav-list-context.tsx";
import { navListQueries } from "./nav-list.stylex.ts";

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
   * Something at the end of the row, in the muted colour at caption size, as
   * a `TabView` sidebar row shows its `count`: a count, a `Badge` such as
   * "Today", or a `StatusDot`. It is part of the link's name, so give a mark
   * with no text a label, as `StatusDot` takes one.
   *
   * @zh 行尾的内容，以弱化颜色和说明文字字号显示，与 `TabView` 侧栏行显示 `count` 的方式相同：一个数量、一个 `Badge`（例如“今天”）或一个 `StatusDot`。它属于链接名称的一部分，因此没有文字的标记要带标签，例如 `StatusDot` 的 `label`。
   */
  trailing?: ReactNode;
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
 * Under a coarse pointer it is at least 44px tall. Where its list is a page of
 * a `NavigationSplitView`, the row shows as a `ListRow`, with a caret.
 */
export function NavLink({
  href,
  current = false,
  icon,
  trailing,
  children,
  css,
}: NavLinkProps) {
  const { linkComponent, motion } = use(NavListContext);
  const isCurrent = useShownCurrent(href, current);
  const hasTrailing = trailing !== undefined && trailing !== null;
  useLayoutEffect(() => {
    motion?.refresh();
  }, [isCurrent, motion]);
  // The link component comes from the context and does not change between
  // renders. In JSX, the static-components rule cannot see this, so use
  // createElement.
  return (
    <FlowBlock as="li" css={navListStyles.row}>
      {createElement(
        linkComponent,
        {
          href,
          "aria-current": isCurrent ? "page" : undefined,
          ...{ [NAV_ROW]: "" },
          ...stylex.props(
            typeRole.label,
            a11y.touchRow,
            corner.radius_2,
            quietSurface.interactive,
            navListStyles.rowInset,
            navListStyles.rowControl,
            styles.link,
            css,
          ),
        },
        icon === undefined ? null : <NavIcon>{icon}</NavIcon>,
        children,
        // The space keeps the name and the trailing text apart for a
        // screen reader. A flex row does not show it.
        hasTrailing ? " " : null,
        hasTrailing ? (
          <span
            key="trailing"
            css={[
              typeRole.caption,
              typeModifier.numeric,
              navListStyles.trailing,
            ]}
          >
            {trailing}
          </span>
        ) : null,
        <span
          key="caret"
          aria-hidden
          css={[styles.caret, hasTrailing && styles.caretAfterTrailing]}
        >
          <CaretRightIcon weight="bold" />
        </span>,
      )}
    </FlowBlock>
  );
}

const styles = stylex.create({
  link: {
    [font.uiBodySmall]: {
      default: null,
      [navListQueries.sidebarPage]: font.uiBody,
    },
    fontWeight: {
      default: font.weight_4,
      ":is([aria-current=page])": {
        default: font.weight_6,
        [navListQueries.sidebarPage]: font.weight_4,
      },
    },
  },
  caret: {
    display: { default: "none", [navListQueries.sidebarPage]: "inline-flex" },
    flexShrink: 0,
    marginInlineStart: "auto",
    color: color.mutedForeground,
  },
  caretAfterTrailing: {
    marginInlineStart: 0,
  },
});
