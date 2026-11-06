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
}

/**
 * The sidebar of a `NavigationSplitView`.
 *
 * @internal
 */
export type NavigationSplitViewSidebar = NavigationSplitViewColumn &
  (
    | {
        /**
         * Where the sidebar goes while it does not fit beside the content.
         * `"page"`: it is the root page of the stack, at `href`. A `content`
         * with `back` pushes over it, and a `content` without `back` does not
         * show. The view stacks while the full sidebar does not fit. A stack
         * needs a router, so it needs `linkStatus`. `"hidden"`: it does not show,
         * or it shows as `collapsed`. It can change with the URL: a screen that
         * opens without its sidebar says `"hidden"` there and `"page"` at the
         * other URLs, and the sidebar keeps its state and its scroll. `"drawer"`:
         * it opens as a drawer from a menu button at the top-end corner of the
         * view, and the content fills the view under the button. Such a view is a
         * document: at every width the page scrolls the content, which lies on the
         * canvas, and beside it the sidebar sticks as an island.
         *
         * @zh 侧栏放不到内容栏旁边时的去向。`"page"`：它是堆叠的根页面，位于 `href`；带 `back` 的 `content` 推入其上，不带 `back` 的 `content` 不显示；完整侧栏放不下时视图堆叠。堆叠需要路由器，因此需要 `linkStatus`。`"hidden"`：不显示，或以 `collapsed` 形态显示。它可以随 URL 变化：打开时没有侧栏的画面在该 URL 传 `"hidden"`，其他 URL 传 `"page"`，侧栏保留其状态与滚动位置。`"drawer"`：它从视图顶部末端角落的菜单按钮以抽屉形式打开，内容栏在按钮下方占满视图。这样的视图是一篇文档：在任何宽度下都由页面滚动内容，内容直接位于画布上，侧栏则作为岛屿固定在它旁边。
         */
        stacked: "page";
        /**
         * The URL where the sidebar is the page that shows. A link to it opens
         * the sidebar at once, as the view has it already.
         *
         * @zh 侧栏作为当前页面显示时的 URL。指向它的链接会立即打开侧栏，因为视图已经拥有它。
         */
        href: string;
      }
    | {
        stacked: "hidden";
        href?: string;
        /**
         * The narrow form of the sidebar, such as a strip of logos. It shows
         * while the detail shows beside the content, and where the full sidebar
         * does not fit but the view is wider than a phone. It takes the label
         * and the key of the sidebar.
         *
         * @zh 侧栏的窄形态，例如一列标志。详情栏显示在内容栏旁边时显示它；在完整侧栏放不下、但视图比手机宽时也显示它。它沿用侧栏的标签与 key。
         */
        collapsed?: ReactNode;
      }
    | {
        stacked: "drawer";
        href?: undefined;
        /**
         * Names the menu button and the open drawer for assistive technology.
         *
         * @zh 菜单按钮与打开的抽屉的无障碍名称。
         */
        menuLabel: string;
        /**
         * Names the close button of the drawer for assistive technology. The
         * package ships no i18n, so the consumer supplies the localised string.
         *
         * @zh 抽屉关闭按钮的无障碍名称。本包不内置 i18n，请由调用方提供本地化字符串。
         */
        closeLabel: string;
        /**
         * What stays at the top of the sidebar while its node scrolls, beside
         * the content and in the drawer, such as the title of the app. It starts
         * on the text edge of a `NavList`.
         *
         * @zh 侧栏 node 滚动时固定在侧栏顶部的内容，在内容栏旁边与抽屉中都显示，例如应用标题。它从 `NavList` 的文字边缘开始。
         */
        header?: ReactNode;
        /**
         * What stays at the bottom of the sidebar while its node scrolls, beside
         * the content and in the drawer, such as the theme and language controls.
         *
         * @zh 侧栏 node 滚动时固定在侧栏底部的内容，在内容栏旁边与抽屉中都显示，例如主题与语言控件。
         */
        footer?: ReactNode;
      }
  );

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
  /** Which column this is. The collapsed sidebar is the sidebar. */
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
   * and `undefined` where the page scrolls the column, as on a phone inside
   * a `TabView` and at every width in a view with a drawer. Give it to a
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

/**
 * A sidebar that is not a page of a stack, the only kind that a view takes where
 * its `linkStatus` is `null`.
 *
 * @internal
 */
export type NavigationSplitViewSidebarWithoutPage = Exclude<
  NavigationSplitViewSidebar,
  { stacked: "page" }
>;

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
   * rendered anchor.
   *
   * @default <a>
   * @zh 渲染各栏的返回链接与每个 `SplitViewLink`。传入框架自带的链接组件即可保留客户端导航，请把收到的每一个 prop 都转发到渲染出的锚点上。
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
         * The first column, such as a list of accounts. It shows full where it
         * fits beside the content and no detail shows beside them. `stacked`
         * says where it goes elsewhere. Without a sidebar, the view has one pane.
         *
         * @zh 第一栏，例如账户列表。在它能放在内容栏旁边、且旁边没有详情栏时，完整显示。`stacked` 决定其他情况下的去向。没有侧栏时视图只有一栏。
         */
        sidebar?: NavigationSplitViewSidebar | null;
        detail?: null;
        /**
         * A component that the view renders inside each `SplitViewLink`, so that
         * a router hook can read whether the navigation to it is pending. Pass
         * `null` where you hold the content yourself, and then pass no
         * `skeleton` and no `"page"` sidebar. A view of one pane needs it only
         * for a `SplitViewLink` in its content.
         *
         * @zh 视图渲染在每个 `SplitViewLink` 内部的组件，让路由器的 Hook 能读取该链接的导航是否处于 pending 状态。内容由你自己持有时传入 `null`，此时不要传入 `skeleton` 和 `"page"` 侧栏。只有一栏的视图只有内容中有 `SplitViewLink` 时才需要它。
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
        sidebar?: NavigationSplitViewSidebarWithoutPage | null;
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
    | {
        sidebar?: null;
        detail?: null;
        linkStatus?: undefined;
        skeleton?: undefined;
      }
  );
