"use client";

import type { ComponentType, ReactNode } from "react";
import { stack } from "../primitives/stack.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  NavListContext,
  PlainAnchor,
  type NavListLinkProps,
} from "./nav-list-context.tsx";

export type { NavListLinkProps } from "./nav-list-context.tsx";

interface NavListProps {
  /**
   * The rows: each a `NavLink`, or a `NavGroup` of them.
   *
   * @zh 各行：每行是一个 `NavLink`，或由它们组成的 `NavGroup`。
   */
  children: ReactNode;
  /**
   * The component that renders every link in the list, groups included, such
   * as a router's link. Defaults to a plain `<a>`. Forward `className` and
   * `style` onto the anchor, or a link loses its look.
   *
   * @zh 渲染列表中每个链接（含分组内的链接）的组件，例如路由的链接组件。默认为普通 `<a>`。请把 `className` 与 `style` 转发到锚点上，否则链接会失去样式。
   */
  linkComponent?: ComponentType<NavListLinkProps>;
  /**
   * StyleX styles merged over the list's own.
   *
   * @zh 合并到列表自身样式之上的 StyleX 样式。
   */
  css?: StyleProp;
}

/**
 * The links that move between the pages of one place, such as a rail of
 * destinations or the sections of a settings screen, in one column. It sits
 * inside the caller's `<nav>`, which names the landmark. Each link pads
 * itself and the rows take no gap, so that padding is the space between them;
 * groups set the larger steps.
 */
export function NavList({
  children,
  linkComponent = PlainAnchor,
  css,
}: NavListProps) {
  return (
    <NavListContext value={{ nested: false, labelled: false, linkComponent }}>
      <ul css={[stack.rows, css]}>{children}</ul>
    </NavListContext>
  );
}
