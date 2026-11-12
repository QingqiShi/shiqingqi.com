import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
} from "react";
import type { StyleProp } from "../../types.ts";
import type { TabLinkStatusProps } from "../use-opening-screen.tsx";

/**
 * The props that `NavigationSplitView` hands its `linkComponent`.
 *
 * @internal
 */
export interface SplitViewLinkProps extends ComponentProps<"a"> {
  href: string;
}

/**
 * The way back from a column to the column under it.
 *
 * @internal
 */
export interface SplitViewBackLink {
  /** The URL of the column under this one. */
  href: string;
  /**
   * The name of the column under this one, such as "Net worth · Cash". The
   * back link of the content shows it, and the detail shows it before its
   * own label, as a breadcrumb.
   */
  label: string;
}

/**
 * One column of a `NavigationSplitView`.
 *
 * @internal
 */
export interface NavigationSplitViewColumn {
  /**
   * What the column shows. The column lays it out as a flex column at least
   * as tall as the column, so a node with `flexGrow: 1` fills the height that
   * its content leaves, such as for a chart.
   */
  node: ReactNode;
  /** Names the column's region for assistive technology. */
  label: string;
  /**
   * Changes when the column shows other content, such as another picked
   * row: the column then starts at the top. In the detail, the old content
   * also fades out and the new content fades in.
   */
  key?: string | null;
  /**
   * The way back to the column under this one. The column shows it as a
   * link at its top, at every width.
   */
  back?: SplitViewBackLink | null;
  /**
   * A control that floats at the bottom end of the column, such as an Add
   * action, over the content that scrolls under it. It stays above the
   * floating tab bar of a `TabView`, and the column keeps room for it after
   * its content, so the last row scrolls clear of it.
   */
  accessory?: ReactNode;
  /**
   * Controls at the top end of the column, on the line of the way back, such
   * as the theme and language controls of a site.
   */
  toolbar?: ReactNode;
  /**
   * Whether the node fills the column from edge to edge, with no gutter and
   * no page column, such as for a scene that bleeds to the edges.
   */
  flush?: boolean;
}

/**
 * The list of a `NavigationSplitView`: what the visitor picks from, such as
 * the accounts of a household or the pages of a site.
 *
 * @internal
 */
export interface NavigationSplitViewSidebar extends NavigationSplitViewColumn {
  /**
   * The URL where the list is the page that shows, where it does not fit
   * beside the content. A link to it opens the list at once, as the view has
   * it already. A `content` with `back` shows over the list there, and a
   * `content` without `back` does not show, so give the content a `back` to
   * this URL at each URL that opens on the content.
   *
   * @zh 列表放不到内容栏旁边时，它作为当前页面显示的 URL。指向它的链接会立即打开列表，因为视图已经拥有它。在那里，带 `back` 的 `content` 显示在列表之上，不带 `back` 的 `content` 不显示；因此在每个应当直接落在内容上的 URL，请给内容一个指向此 URL 的 `back`。
   */
  href: string;
  /**
   * What shows at the top of the sidebar, above its node, such as the
   * title of the site. In a `TabView`, the sidebar of that view has its
   * own `header`, and this one does not show.
   *
   * @zh 显示在侧栏顶部、node 上方的内容，例如站点标题。在 `TabView` 里，侧边栏用的是该视图自己的 `header`，这一个不显示。
   */
  header?: ReactNode;
  /**
   * What shows at the bottom of the sidebar, under its node, such as the
   * theme and language controls. In a `TabView`, the `footer` of that
   * view shows there instead.
   *
   * @zh 显示在侧栏底部、node 下方的内容，例如主题与语言控件。在 `TabView` 里，那里显示的是该视图的 `footer`。
   */
  footer?: ReactNode;
  /**
   * Names the button that collapses the sidebar and expands it again,
   * already localised. Without it, a view outside a `TabView` has no such
   * button. In a `TabView`, the button of that view does this.
   *
   * @zh 收起、再展开侧栏的按钮的无障碍名称，需已本地化。不传时，`TabView` 之外的视图没有这个按钮。在 `TabView` 里，由该视图的按钮负责。
   */
  toggleLabel?: string;
  /**
   * Whether the server paints the sidebar collapsed, outside a
   * `TabView`. The view keeps the visitor's choice in the
   * `SIDEBAR_COLLAPSED_COOKIE` cookie and follows it once the page
   * hydrates. Where the server can read the cookie, pass its value here.
   *
   * @default false
   * @zh 在 `TabView` 之外，服务端是否把侧栏画成收起。视图把访客的选择记在 `SIDEBAR_COLLAPSED_COOKIE` cookie 里，并在页面水合后跟随它。服务端能读到这个 cookie 时，把它的值传到这里。
   */
  defaultCollapsed?: boolean;
}

/**
 * The detail of a `NavigationSplitView`.
 *
 * @internal
 */
export interface NavigationSplitViewDetail extends Omit<
  NavigationSplitViewColumn,
  "accessory" | "back"
> {
  /**
   * The way back to the content. The close button and Esc go there. Beside
   * the content, the detail shows `back.label` › `label` above its node.
   */
  back: SplitViewBackLink;
  /**
   * Names the close button of the detail for assistive technology, beside the
   * content and in the sheet. The package ships no i18n, so the consumer supplies
   * the localised string.
   *
   * @zh 详情栏关闭按钮的无障碍名称，详情栏在内容栏旁边与面板中都会用到。本包不内置 i18n，请由调用方提供本地化字符串。
   */
  closeLabel: string;
}

/**
 * What `useSplitViewColumn` tells a column about itself.
 *
 * @internal
 */
export interface SplitViewColumnState {
  /** Which column this is. */
  column: "sidebar" | "content" | "detail";
  /**
   * `"sheet"` where the detail shows in a sheet over the content, as on a
   * phone, `"page"` where the sidebar is a page of the stack, or can still
   * turn out to be one before the view has measured itself, and `"column"`
   * everywhere else.
   */
  presentation: "column" | "sheet" | "page";
  /**
   * The box that scrolls the column, `null` until it mounts and in a sheet,
   * and `undefined` where the page scrolls the column, as on a phone. Give it to a
   * virtual list as its scroll parent, or the window where it is `undefined`.
   */
  scroller: HTMLElement | null | undefined;
  /**
   * Whether the view shows this column now, for a column that can stop its work
   * while it does not show, such as a fetch. `false` only where the view knows
   * that the column does not show: a column that shows at some widths is `true`
   * until the view has measured itself, as on the server and in the first render
   * on the client, where CSS decides what paints. Thus the server and the client
   * agree, and a column that shows never paints what it shows for `false`. A
   * page under the one that shows, or one that leaves, takes the value of its
   * column, as a motion can show it. The content at the root URL of a stack stays
   * `false` while a link opens a page over the sidebar, because the new page takes
   * its place.
   */
  isShown: boolean;
  /**
   * Takes this column off and goes back to the column under it, as its close
   * button does. `null` where the column has no `back`.
   */
  close: (() => void) | null;
}

interface NavigationSplitViewBaseProps {
  /**
   * The middle column, such as one account and its ledger. It takes the
   * width that the other columns leave.
   *
   * @zh 中间一栏，例如一个账户及其账目。它占用其他各栏留下的宽度。
   */
  content: NavigationSplitViewColumn;
  /**
   * Renders each back link and each `SplitViewLink`. Pass a framework link to
   * keep client-side navigation, and forward every prop it is handed onto the
   * rendered anchor. Without it, the link of the nearest `LinkProvider`
   * renders them.
   *
   * @zh 渲染各栏的返回链接与每个 `SplitViewLink`。传入框架自带的链接组件即可保留客户端导航，请把收到的每一个 prop 都转发到渲染出的锚点上。不传时使用最近的 `LinkProvider` 提供的链接组件。
   */
  linkComponent?: ComponentType<SplitViewLinkProps>;
  /**
   * Replaces the current history entry with `href`, as a router's
   * `replace` does. The view calls it where the history rule replaces. Pass
   * the router's to keep client-side navigation.
   *
   * @default location.replace
   * @zh 用 `href` 替换当前的历史记录项，与路由器的 `replace` 相同。视图在历史规则要求替换时调用它。传入路由器的方法即可保留客户端导航。
   */
  replace?: (href: string) => void;
  /**
   * StyleX styles merged over the view's own, such as `pageColumn.settings` to
   * set the width of the content.
   *
   * @zh 合并到视图自身样式之上的 StyleX 样式，例如用 `pageColumn.settings` 设定内容的宽度。
   */
  css?: StyleProp;
}

/** @internal */
export type NavigationSplitViewProps = NavigationSplitViewBaseProps &
  (
    | {
        /**
         * The list, such as the accounts. It is the sidebar where it fits
         * beside the content, and the first page of a stack where it does not.
         * A screen with no list and no detail is a `NavigationStack`.
         *
         * @zh 列表，例如各个账户。放得下时它是内容旁的侧边栏，放不下时它是堆叠的第一页。既没有列表也没有详情的画面请用 `NavigationStack`。
         */
        sidebar?: NavigationSplitViewSidebar | null;
        detail?: null;
        /**
         * A component that the view renders inside each `SplitViewLink`, so that
         * a router hook can read whether the navigation to it is pending. Pass
         * `null` where you hold the content yourself, and then pass no
         * `skeleton`.
         *
         * @zh 视图渲染在每个 `SplitViewLink` 内部的组件，让路由器的 Hook 能读取该链接的导航是否处于 pending 状态。内容由你自己持有时传入 `null`，此时不要传入 `skeleton`。
         */
        linkStatus: ComponentType<TabLinkStatusProps>;
        /**
         * What the content column shows after a moment of waiting, in the shape
         * of the content.
         *
         * @zh 等待片刻后内容栏显示的内容，形状与内容一致。
         */
        skeleton: ReactElement;
      }
    | {
        sidebar?: NavigationSplitViewSidebar | null;
        /**
         * The last column, such as the editor of a picked transaction. Pass it
         * only while something is picked. It shows beside the content where both
         * fit, and in a sheet over the content where they do not, as on a phone.
         * It needs `linkStatus` to be `null`.
         *
         * @zh 最后一栏，例如所选交易的编辑器。只在有选中项时传入。两者放得下时显示在内容栏旁边；放不下时（例如在手机上）以覆盖内容栏的面板显示。它要求 `linkStatus` 为 `null`。
         */
        detail?: NavigationSplitViewDetail | null;
        linkStatus: null;
        skeleton?: undefined;
      }
  );
