"use client";

import * as stylex from "@stylexjs/stylex";
import type { ComponentType, ReactNode } from "react";
import { rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { NavigationSplitView } from "./navigation-split-view.tsx";
import type {
  SplitViewBackLink,
  SplitViewLinkProps,
} from "./split-view/types.ts";

export type { SplitViewBackLink } from "./split-view/types.ts";

interface NavigationStackProps {
  /**
   * Names the screen's region for assistive technology, already localised,
   * such as the title of the screen.
   *
   * @zh 画面区域的无障碍名称，需已本地化，例如画面的标题。
   */
  label: string;
  /**
   * The way back to the screen under this one. The screen shows it as a link
   * at its top, and a swipe from the start edge of a phone follows it. Leave it
   * out on the first screen of a destination.
   *
   * @zh 回到下一层画面的途径。画面在顶部把它显示为链接，在手机上从起始边缘滑动也会沿它返回。目标页的第一个画面不传。
   */
  back?: SplitViewBackLink | null;
  /**
   * A control that floats at the bottom end of the screen, such as an Add
   * action, over the content that scrolls under it. It stays above the tab bar
   * of a `TabView`.
   *
   * @zh 浮在画面底部末端的控件，例如"添加"操作，内容在它下方滚动。它保持在 `TabView` 的标签栏上方。
   */
  accessory?: ReactNode;
  /**
   * Controls at the top end of the screen, on the line of the way back, such
   * as the theme and language controls of a site.
   *
   * @zh 画面顶部末端的控件，与返回链接在同一行，例如站点的主题与语言控件。
   */
  toolbar?: ReactNode;
  /**
   * Whether the content fills the screen from edge to edge, such as for a
   * scene that bleeds to the edges. Each part of the content then sets its own
   * page column, with `pageColumn.base`, and the screen puts no gap between
   * its children.
   *
   * @default false
   * @zh 内容是否从边到边铺满画面，例如需要出血到边缘的场景。此时内容的每一部分用 `pageColumn.base` 自行设定页面栏，画面也不在子元素之间留间距。
   */
  flush?: boolean;
  /**
   * Changes when the screen shows other content at the same URL, such as
   * another month: the screen then starts at the top.
   *
   * @zh 当画面在同一 URL 显示另一份内容（例如另一个月份）时变化：画面随即回到顶部。
   */
  contentKey?: string | null;
  /**
   * Renders the back link. Without it, the link of the nearest `LinkProvider`
   * renders it.
   *
   * @zh 渲染返回链接。不传时使用最近的 `LinkProvider` 提供的链接组件。
   */
  linkComponent?: ComponentType<SplitViewLinkProps>;
  /**
   * Replaces the current history entry with `href`, as a router's `replace`
   * does. Pass the router's to keep client-side navigation.
   *
   * @default location.replace
   * @zh 用 `href` 替换当前的历史记录项，与路由器的 `replace` 相同。传入路由器的方法即可保留客户端导航。
   */
  replace?: (href: string) => void;
  /**
   * StyleX styles merged over the screen's own, such as `pageColumn.settings`
   * to set the width of the content.
   *
   * @zh 合并到画面自身样式之上的 StyleX 样式，例如用 `pageColumn.settings` 设定内容的宽度。
   */
  css?: StyleProp;
  /**
   * The content of the screen. The screen puts the gap of a group between its
   * children, so a screen needs no layout of its own.
   *
   * @zh 画面的内容。画面在各子元素之间留出"组"的间距，因此画面不需要自己写布局。
   */
  children: ReactNode;
}

/**
 * A screen of one pane: its content in the page column, with the way back at
 * its top. Use it for each screen that has
 * nothing beside it, in a `TabView` or by itself. A screen with a list beside
 * its content, or a detail, is a `NavigationSplitView`.
 *
 * The page scrolls the content, so that the browser can shrink its bars as
 * the page scrolls. Outside a `TabView`, the screen is
 * the `<main>` landmark.
 */
export function NavigationStack({
  label,
  back,
  accessory,
  toolbar,
  flush = false,
  contentKey,
  linkComponent,
  replace,
  css,
  children,
}: NavigationStackProps) {
  return (
    <NavigationSplitView
      linkComponent={linkComponent}
      linkStatus={null}
      replace={replace}
      css={css}
      content={{
        label,
        back,
        accessory,
        toolbar,
        flush,
        key: contentKey,
        node: (
          <div css={[styles.children, flush && styles.flush]}>{children}</div>
        ),
      }}
    />
  );
}

const styles = stylex.create({
  // A child with `flexGrow: 1` fills the height that the others leave.
  children: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    gap: rhythm.group,
    minBlockSize: 0,
  },
  flush: {
    gap: 0,
  },
});
