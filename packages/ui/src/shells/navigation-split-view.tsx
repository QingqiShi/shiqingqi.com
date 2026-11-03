"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { Button } from "../actions/button.tsx";
import { NavViewContext } from "../actions/nav-list-context.tsx";
import { PlainAnchor } from "../actions/tab-bar.tsx";
import { isPlainClick } from "../actions/use-tab-press.ts";
import { listRowTokens } from "../data-display/list.stylex.ts";
import { scrollsBlock } from "../effect-layer/check-declared-carrier.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useDust } from "../effect-layer/use-dust.ts";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useExtractorFan } from "../effect-layer/use-extractor-fan.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { findTwinElement } from "../focus/find-twin-element.ts";
import { isRendered } from "../focus/is-rendered.ts";
import { isTyping } from "../focus/is-typing.ts";
import { getScrollBehavior } from "../get-scroll-behavior.ts";
import { mergeRefs } from "../merge-refs.ts";
import {
  createPendingSnapshot,
  type PendingSnapshot,
} from "../motion/create-pending-snapshot.ts";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import { useMotionEngine } from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "../primitives/motion.stylex.ts";
import {
  pageColumn,
  pageColumnTokens,
  pageGutter,
} from "../primitives/page-column.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { islandSurface, islandTokens } from "../surfaces/island.stylex.ts";
import { SheetRecedeContext } from "../surfaces/sheet-recede-context.ts";
import { Sheet, useIsInSheetBoundary } from "../surfaces/sheet.tsx";
import {
  releaseVelocity,
  type DragSample,
} from "../surfaces/should-dismiss.ts";
import {
  color,
  controlHeight,
  layer,
  rhythm,
  shadow,
  space,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import {
  claimEdgeSwipe,
  EDGE_SWIPE_ZONE,
  shouldPop,
} from "./claim-edge-swipe.ts";
import {
  createPageScroll,
  currentContentScroller,
  STACK_ROOT_KEY,
  type PageScroll,
} from "./create-page-scroll.ts";
import {
  addSplitViewMark,
  createSplitViewMotion,
  isViewStacked,
  pxToRem,
  STACK_PAGE_BELOW_REM,
  STACKED_BELOW_REM,
  type SplitViewChange,
  type SplitViewMotion,
  type SplitViewMarkElement,
  type SplitViewMarks,
  type SplitViewSnapshot,
} from "./create-split-view-motion.ts";
import {
  followPage,
  replacePage,
  settlePages,
  type SplitViewPage,
  type SplitViewPages,
} from "./follow-page.ts";
import { headerControlsTokens } from "./header-controls.stylex.ts";
import { LeavingCopyTaker, type LeavingCopy } from "./leaving-copy-taker.tsx";
import { liftOrigin } from "./lift-origin.ts";
import {
  splitViewDisplay,
  splitViewQueries,
  splitViewWidths,
} from "./navigation-split-view-layout.stylex.ts";
import { splitViewTokens } from "./navigation-split-view.stylex.ts";
import { normalizeUrl } from "./normalize-url.ts";
import { SidebarDrawer } from "./sidebar-drawer.tsx";
import { tabViewTokens } from "./tab-view.stylex.ts";
import { useIsInTabView, useTabViewOpening } from "./tab-view.tsx";
import {
  StatusLink,
  useOpeningScreen,
  useReveal,
  type TabLinkStatusProps,
} from "./use-opening-screen.tsx";

/**
 * The narrowest view, in rem, where the detail shows beside the content:
 * the collapsed sidebar, 20rem of content, the detail and the gaps around
 * the islands. It is the same width as `splitViewQueries.detailBeside`.
 */
const DETAIL_BESIDE_MIN_REM = 50.75;

/** How far an arrow key scrolls the content, in px. */
const ARROW_KEY_STEP = 40;
/** The share of the content's height that a page key scrolls. */
const PAGE_KEY_SHARE = 0.9;

/** The props that `NavigationSplitView` hands its `linkComponent`. */
export interface SplitViewLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** The way back from a column to the column under it. */
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

/** One column of a `NavigationSplitView`. */
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

/** The sidebar of a `NavigationSplitView`. */
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
         * view, and the content fills the view under the button.
         *
         * @zh 侧栏放不到内容栏旁边时的去向。`"page"`：它是堆叠的根页面，位于 `href`；带 `back` 的 `content` 推入其上，不带 `back` 的 `content` 不显示；完整侧栏放不下时视图堆叠。堆叠需要路由器，因此需要 `linkStatus`。`"hidden"`：不显示，或以 `collapsed` 形态显示。它可以随 URL 变化：打开时没有侧栏的画面在该 URL 传 `"hidden"`，其他 URL 传 `"page"`，侧栏保留其状态与滚动位置。`"drawer"`：它从视图顶部末端角落的菜单按钮以抽屉形式打开，内容栏在按钮下方占满视图。
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

/** The detail of a `NavigationSplitView`. */
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

/** What `useSplitViewColumn` tells a column about itself. */
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
   * a `TabView`. Give it to a virtual list as its scroll parent, or the
   * window where it is `undefined`.
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

const SplitViewColumnContext = createContext<SplitViewColumnState | null>(null);

interface SplitViewState {
  linkComponent: ComponentType<SplitViewLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  setOpening: ReturnType<typeof useOpeningScreen>["setOpening"];
  /** Follows a column link of `column`, by the history rule of the view. */
  follow: (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    column: SplitViewColumnState["column"],
  ) => void;
}

const SplitViewContext = createContext<SplitViewState | null>(null);

/**
 * Which column is around the caller, and the box that scrolls it. `null`
 * outside a `NavigationSplitView`.
 */
export function useSplitViewColumn() {
  return use(SplitViewColumnContext);
}

/**
 * The elements of each Shared element of the view around, `null` outside a
 * view.
 */
const SplitViewMarksContext = createContext<SplitViewMarks | null>(null);

/**
 * What the Column links of a sidebar form do with dust while the sidebar
 * folds: the form that goes sheds it, and the form that comes pulls it in.
 */
const SplitViewDustContext = createContext<"shed" | "pull" | null>(null);

/** How much dust a Column link of the sidebar form that goes sheds. */
const FOLD_DUST_DENSITY = 60;
/** How far a Column link of the sidebar form that comes pulls dust in, in px. */
const FOLD_FAN_REACH = 360;

/**
 * Marks an element as one form of the Shared element `name`, such as an
 * account's avatar in the sidebar, its tile in the Collapsed sidebar, or a
 * chart in the content and its compact form in the sidebar. Attach the
 * returned ref. When a navigation hides the form that showed and shows
 * another, the view flies one into the other. When a navigation moves the
 * one form, such as a list that a new chart above it pushes down, the view
 * moves it there. A form can be a part of an SVG drawing, such as the line
 * of a chart, which stretches as it flies. A Shared element can hold
 * others, such as a chart that holds its line and its labels: they fly on
 * their own, the form it leaves stays, and the rest of the form it goes to
 * shows as they land. Give each form a box of its own, and give one name to
 * at most one form that shows at a time. Outside a `NavigationSplitView`,
 * and for a `null` name, the ref does nothing.
 */
export function useSplitViewShared(
  name: string | null,
  { fade = "cross" }: SplitViewSharedOptions = {},
) {
  const marks = use(SplitViewMarksContext);
  return (element: SplitViewMarkElement | null) => {
    if (element === null || marks === null || name === null) return undefined;
    return addSplitViewMark(marks, name, element, { fade });
  };
}

export interface SplitViewSharedOptions {
  /**
   * How the two forms of the Shared element change over while it flies:
   * `"cross"` cross-fades them, and `"dip"` fades it out most of the way at
   * the middle of its flight and back in as it lands. Use `"dip"` for a
   * label that rides along with a part that changes shape, such as the
   * value at the top of a chart.
   *
   * @default "cross"
   * @zh 共享元素飞行时两种形态如何交替：`"cross"` 交叉淡化；`"dip"` 在飞行中途淡出大半，落地时再淡入。用于随一个改变形状的部分一起移动的标签，例如图表顶端的数值。
   */
  fade?: "cross" | "dip";
}

/**
 * A link in a column that opens or changes the column after it, such as a
 * row of a list. It renders the view's `linkComponent` and follows the
 * history rule of the view. J and K move focus between the column links of
 * one column. Pass it as the link component of a row, such as `ListRow`'s.
 * With `linkStatus`, it tells the view while the navigation to it is pending,
 * from any column, and the view answers at once. Use it for each link that
 * changes what the view shows. A plain link leaves the view as it is until the
 * router has the new page. While the sidebar folds, the links of the form that goes dissolve into
 * dust that the links of the form that comes pull in, on the effect layer.
 */
export function SplitViewLink({
  onClick,
  ref,
  skipsKeys = false,
  ...props
}: SplitViewLinkProps & {
  /**
   * Keeps J and K from stopping on this link, for a link that is not an item of
   * its column, such as a breadcrumb in a column with no list.
   *
   * @zh 让 J 与 K 不停留在这个链接上，用于不属于该栏条目的链接，例如没有列表的栏中的面包屑。
   */
  skipsKeys?: boolean;
}) {
  const view = use(SplitViewContext);
  const column = use(SplitViewColumnContext);
  const dust = use(SplitViewDustContext);
  const dustRef = useDust({ density: dust === "shed" ? FOLD_DUST_DENSITY : 0 });
  const fanRef = useExtractorFan({
    reach: dust === "pull" ? FOLD_FAN_REACH : 0,
  });
  const linkRef = mergeRefs(ref, dustRef, fanRef);
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (view !== null && column !== null) {
      view.follow(event, props.href, column.column);
    }
  };
  return (
    <StatusLink
      {...props}
      ref={linkRef}
      data-split-view-link={skipsKeys ? undefined : ""}
      onClick={follow}
      linkComponent={view?.linkComponent ?? PlainAnchor}
      linkStatus={view?.linkStatus ?? null}
      setOpening={view?.setOpening ?? ignoreOpening}
    />
  );
}

function ignoreOpening() {}

/**
 * Shows its children only where the content fills the view and covers the
 * sidebar, as on a phone. CSS decides, so the first paint is right, also from
 * the server. Outside a `NavigationSplitView`, it shows nothing.
 */
export function StackedOnly({ children }: { children: ReactNode }) {
  return <div css={styles.stackedOnly}>{children}</div>;
}

/**
 * Shows its children only where the content does not fill the view, so
 * that a column shows beside it. It is the opposite of `StackedOnly`. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 */
export function UnlessStacked({ children }: { children: ReactNode }) {
  return <div css={styles.unlessStacked}>{children}</div>;
}

/**
 * Shows its children only where the view does not show the full sidebar:
 * where the collapsed sidebar shows, or no sidebar. Use it for what the
 * full sidebar shows otherwise, such as the title of the screen. CSS
 * decides. Outside a `NavigationSplitView`, it shows them.
 */
export function UnlessFullSidebar({ children }: { children: ReactNode }) {
  return <div css={styles.unlessFullSidebar}>{children}</div>;
}

/**
 * A sidebar that is not a page of a stack, the only kind that a view takes where
 * its `linkStatus` is `null`.
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

type NavigationSplitViewProps = NavigationSplitViewBaseProps &
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
         * @zh 视图渲染在每个 `SplitViewLink` 内部的组件，让路由器的 hook 能读取该链接的导航是否处于 pending 状态。内容由你自己持有时传入 `null`，此时不要传入 `skeleton` 和 `"page"` 侧栏。只有一栏的视图只有内容中有 `SplitViewLink` 时才需要它。
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

/**
 * Up to three columns side by side, each in its own scroll box, as tall as
 * the screen: a sidebar, the content, and the detail of what is picked. The
 * consumer decides what is picked, normally from the URL, and passes the
 * columns that show it.
 *
 * The view fits the columns to the width it gets, not to the screen. While
 * a detail shows beside the content, the sidebar folds to the collapsed
 * sidebar. Without one, the sidebar shows full where it fits, collapsed
 * where it does not, and not at all on a phone, where the content fills the
 * view. Where the detail does not fit beside the content, it shows in a
 * sheet over it. A change of the composition keeps each column and its
 * scroll. Where the view fills a screen narrower than 30rem, as on a phone, the
 * page scrolls the content instead of its scroll box, so that it goes under the
 * status bar of the browser, and each page of the content keeps its own
 * scroll. The view fills the screen unless it is in a `SheetBoundary`, and it
 * then always scrolls its columns. Outside a `TabView` and a `SheetBoundary`,
 * the content column is the `<main>` landmark, and a key that scrolls, while
 * nothing has focus, scrolls the content, as it would the page.
 *
 * Without a `sidebar`, the view is one pane, the layout of a screen with nothing
 * beside it: `<NavigationSplitView content={{ label, node, accessory }} />`.
 * Without a `detail` too, it needs no `linkStatus`.
 *
 * The content of every view sits in the page column, centred in the content
 * column, and a named width such as `pageColumn.settings` in `css` sets its
 * width. Without one, a view with a sidebar spans its column, and a view of one
 * pane takes the width of the page column around it. The detail and the sidebar
 * always span their columns.
 *
 * History: a column link (`SplitViewLink`) that opens a column deeper than
 * those that show pushes an entry. One that changes what a column already
 * shows replaces the entry, so that Back still takes off one column at a
 * time. Taking a column off — its back link, the close button, Esc, ← or a
 * dismissed sheet — goes back one entry where that entry is the column
 * under it, and else replaces the entry with the `back` URL, such as after
 * a reload. Thus no take-off leaves an entry that Back must step through.
 *
 * With `sidebar.stacked` set to `"page"`, the sidebar is the root page of a
 * stack, which needs a `linkStatus`, wherever it does not fit beside the content, and the `back` of the
 * content shows only there. Beside the sidebar, a change of the content is a
 * cross-fade, and the only way back is the history rule above. A view with
 * `linkStatus` can also have a URL that opens with no sidebar, and a page of
 * the stack is then deeper than that URL: from it, the sidebar or the content
 * pushes in, and each goes back out to it.
 *
 * With `sidebar.stacked` set to `"drawer"`, the sidebar opens as a drawer from a
 * menu button at the top-end corner wherever it does not fit beside the content:
 * focus stays in it, the page does not scroll, and Esc, the backdrop or a link in
 * it closes it. The view publishes the room of the button as
 * `headerControlsTokens`, for a first row to keep clear of it.
 *
 * With a `linkStatus`, a `NavLink` or a `ListRow` marks its link at once, a
 * stacked view opens the destination at once, and if the screen takes more than
 * a moment, the content column shows `skeleton` while the old content stays
 * mounted, hidden, and the new content then fades in. With Next, pass it with the
 * matching `Link` as `linkComponent`. It also says that the router owns the
 * content: `content.node` shows the page of the current URL, whatever its key. So
 * the view keeps no page of it under the new one, and a page that leaves shows a
 * copy of its DOM, with no ids and out of reach of focus. With `null`, the view
 * keeps the real pages. A detail needs `null`, as its column keeps the real page
 * that leaves, and a page that the router owns would show the new URL as it goes.
 * A stack needs a router, so where `linkStatus` is `null` the sidebar cannot be
 * `stacked: "page"`, which is what `NavigationSplitViewSidebarWithoutPage` says.
 *
 * Keys, unless focus is in a field, a sheet or a dialog: Esc and ← take the
 * deepest column off. J and K move focus to the next and the previous
 * column link in the column that has focus, and Enter and → follow it. A view in
 * a `SheetBoundary` takes keys only while focus is in it.
 *
 * Motion follows the URL, after the first paint. A deeper column page
 * springs in over the page it leaves, which drifts back and dims, and a
 * shallower one springs back out. A detail slides in beside the content
 * while the sidebar folds, and the Shared elements (`useSplitViewShared`)
 * fly between their forms. What the content shows moves to its new place
 * in the narrower or wider column: a box that keeps its size moves as one,
 * the boxes in a box that changes its size move by the same rule, and text
 * that wraps again changes at once. A detail in a sheet grows out of the
 * link in the content that opens it, a column link or a plain one, and
 * shrinks back into it. Where the content is stacked, a drag from the
 * start edge of the content takes it off. A navigation in the middle of a
 * motion starts from where the motion is. Under reduced motion, each change
 * is a short cross-fade. The Shared elements fly only for a navigation that
 * the view starts, such as from a column link or a back link, and for Back
 * and Forward of the browser. Another navigation, such as a `router.push`
 * after a form, moves the columns, the sidebar, the pages and the boxes of
 * the content only.
 */
export function NavigationSplitView({
  sidebar,
  content,
  detail,
  linkComponent = PlainAnchor,
  linkStatus = null,
  skeleton,
  replace = replaceLocation,
  css,
}: NavigationSplitViewProps) {
  const [view, setView] = useState<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [marks] = useState<SplitViewMarks>(() => new Map());
  const widthsReached = useViewWidthsReached(view);
  const fitsCollapsed = widthsReached === null ? null : widthsReached >= 1;
  const fitsFullSidebar = widthsReached === null ? null : widthsReached >= 2;
  const detailBeside = widthsReached === null ? null : widthsReached >= 3;
  const isRouted = linkStatus !== null;
  const hasSidebar = sidebar != null;
  const drawer = sidebar?.stacked === "drawer" ? sidebar : null;
  const collapsedSidebar =
    sidebar?.stacked === "hidden" ? (sidebar.collapsed ?? null) : null;
  const hasCollapsed = collapsedSidebar !== null;
  const stacks = isRouted && hasSidebar && drawer === null && !hasCollapsed;
  const sidebarFits =
    stacks || drawer !== null ? fitsFullSidebar : fitsCollapsed;
  const isInTabView = useIsInTabView();
  const isContained = useIsInSheetBoundary();
  const fillsScreen = !isInTabView && !isContained;
  const isPageSidebar = sidebarFits === false;
  const asSheet = detail != null && detailBeside === false;
  const detailColumn = asSheet ? null : (detail ?? null);
  const hasDetailColumn = detailColumn !== null;
  const deepest = detail ?? content;
  const deepestBack = deepest.back ?? null;

  // A navigation that the view replaces the history entry with goes through
  // `replace`, not through a link, so no link can tell that it is pending.
  const [replacing, setReplacing] = useOptimistic<string | null>(null);
  const [, startReplacing] = useTransition();
  const { opening, setOpening, skeletonHref } = useOpeningScreen(replacing);
  const tabOpening = useTabViewOpening();
  const opensStackRoot =
    stacks &&
    opening !== null &&
    sidebar.href !== undefined &&
    normalizeUrl(opening) === normalizeUrl(sidebar.href);
  const opensContent = opening !== null && !opensStackRoot;
  const waiting = skeletonHref !== null && !opensStackRoot;
  const { revealing, onAnimationEnd } = useReveal(waiting);
  const replaceWaiting = (href: string) => {
    if (linkStatus === null) {
      replace(href);
      return;
    }
    startReplacing(() => {
      setReplacing(href);
      replace(href);
    });
  };
  // Pending decides which page of the stack shows, so that the stack answers
  // at once. A destination that opens deeper than a URL with no sidebar waits
  // in place, as the page that shows there still has the content of that URL.
  const isAtStackRoot =
    stacks && sidebar.stacked === "page" && content.back == null;
  const depth = opensStackRoot
    ? STACK_ROOT_DEPTH
    : isAtStackRoot
      ? opensContent
        ? DEEP_DEPTH
        : STACK_ROOT_DEPTH
      : content.back != null
        ? DEEP_DEPTH
        : 0;
  const showsStackRoot = stacks && depth === STACK_ROOT_DEPTH;
  const [wasDepth, setWasDepth] = useState(depth);
  if (wasDepth !== depth) setWasDepth(depth);
  const depthChange =
    wasDepth === depth ? null : depth > wasDepth ? "push" : "pop";

  // Each column keeps the pages that a motion still shows, and a change of
  // the URL is a motion of the next number.
  const [motion, setMotion] = useState<{ id: number; change: SplitViewChange }>(
    { id: 0, change: { content: null, stackRoot: null, detail: null } },
  );
  const [settled, setSettled] = useState(0);
  const nextMotion = motion.id + 1;
  const [pages, setPages] = useState<SplitViewPages<NavigationSplitViewColumn>>(
    () => pagesOf(content),
  );
  const [details, setDetails] =
    useState<SplitViewPages<NavigationSplitViewDetail> | null>(() =>
      detailColumn === null ? null : pagesOf(detailColumn),
    );
  const [goneDetail, setGoneDetail] =
    useState<SplitViewPage<NavigationSplitViewDetail> | null>(null);

  let nextPages = pages;
  let contentChange: SplitViewChange["content"] = null;
  if (pages.current.key !== (content.key ?? "")) {
    const next = pageOf(content, nextMotion);
    if (isRouted) {
      const leftAs = waiting
        ? "skeleton"
        : opensContent && wasDepth === DEEP_DEPTH
          ? "blank"
          : undefined;
      nextPages = replacePage(pages, next, leftAs);
      contentChange = depthChange ?? "swap";
    } else {
      const followed = followPage(pages, next);
      nextPages = followed.pages;
      contentChange = followed.change;
    }
  } else if (pages.current.column !== content) {
    nextPages = { ...pages, current: pageOf(content, 0) };
  }
  if (isRouted && contentChange === null) {
    contentChange = depthChange;
  }
  // A tab rises into place, or fades in over its skeleton. A skeleton that shows
  // already takes the place of the page that a push would cover.
  if (isRouted && contentChange !== null) {
    if (tabOpening !== null) {
      nextPages = { ...nextPages, leaving: null };
      contentChange = "swap";
    } else if (waiting && contentChange === "push") {
      contentChange = "swap";
    }
  }
  nextPages = settlePages(nextPages, settled);
  if (nextPages !== pages) setPages(nextPages);
  const stackRootPart: SplitViewChange["stackRoot"] =
    !stacks || contentChange === "swap" || wasDepth === depth
      ? null
      : Math.min(wasDepth, depth) === STACK_ROOT_DEPTH
        ? "back"
        : Math.max(wasDepth, depth) === STACK_ROOT_DEPTH
          ? "front"
          : null;

  // A detail that moves out of the sheet, as when the view grows, is no
  // motion.
  const [hadDetail, setHadDetail] = useState(detail != null);
  if (hadDetail !== (detail != null)) setHadDetail(detail != null);
  let nextDetails = details;
  let nextGone = goneDetail;
  let detailChange: SplitViewChange["detail"] = null;
  if (detailColumn !== null) {
    if (details === null) {
      if (!hadDetail) detailChange = "in";
      nextDetails = pagesOf(detailColumn);
      nextGone = null;
    } else if (details.current.key !== (detailColumn.key ?? "")) {
      detailChange = "swap";
      nextDetails = followPage(details, pageOf(detailColumn, nextMotion)).pages;
    } else if (details.current.column !== detailColumn) {
      nextDetails = { ...details, current: pageOf(detailColumn, 0) };
    }
  } else if (details !== null) {
    nextDetails = null;
    // A detail that moves into the sheet goes at once.
    if (detail == null) {
      detailChange = "out";
      nextGone = { ...details.current, motion: nextMotion };
    }
  }
  if (nextDetails !== null) nextDetails = settlePages(nextDetails, settled);
  if (nextGone !== null && nextGone.motion <= settled) nextGone = null;
  if (nextDetails !== details) setDetails(nextDetails);
  if (nextGone !== goneDetail) setGoneDetail(nextGone);

  if (contentChange !== null || detailChange !== null) {
    setMotion({
      id: nextMotion,
      change: {
        content: contentChange,
        stackRoot: stackRootPart,
        detail: detailChange,
      },
    });
  }

  const engine = useMotionEngine();
  const motionRef = useRef<SplitViewMotion | null>(null);
  // Where the Shared elements show before a navigation of the view, for the
  // motion that the navigation brings. Until that motion, it is read again
  // at each frame, scroll and commit, as the data can come much later.
  const pendingRef = useRef<PendingSnapshot<SplitViewSnapshot> | null>(null);
  const pageScrollRef = useRef<PageScroll | null>(null);
  const leavingCopyRef = useRef<LeavingCopy | null>(null);
  const capture = (to: string, isHistoryStep = false) => {
    pageScrollRef.current?.remember(isHistoryStep);
    pendingRef.current?.take(normalizeUrl(to));
  };
  const recapture = useEffectEvent(() => {
    pendingRef.current?.refresh();
  });
  const [folding, setFolding] = useState<"fold" | "unfold" | null>(null);
  useLayoutEffect(() => {
    if (view === null || layer === null) return;
    const created = createSplitViewMotion(engine, view, layer, marks, {
      onFold: setFolding,
      onSettled: (id) => {
        setSettled((current) => Math.max(current, id));
      },
      onFrame: () => {
        recapture();
      },
    });
    motionRef.current = created;
    pendingRef.current = createPendingSnapshot(() => created.capture());
    return () => {
      created.destroy();
      motionRef.current = null;
      pendingRef.current = null;
    };
  }, [engine, view, layer, marks]);

  const shownKey = useEffectEvent(() =>
    showsStackRoot ? STACK_ROOT_KEY : (content.key ?? ""),
  );
  const opensOtherTab = tabOpening !== null;
  const isOpening = opensContent || opensStackRoot || opensOtherTab;
  const isOpeningNow = useEffectEvent(() => isOpening);
  const [pageScrolls, setPageScrolls] = useState(false);
  useLayoutEffect(() => {
    if (view === null) return;
    const created = createPageScroll(
      view,
      shownKey(),
      setPageScrolls,
      isRouted,
      isOpeningNow(),
    );
    pageScrollRef.current = created;
    return () => {
      created.destroy();
      pageScrollRef.current = null;
    };
  }, [view, isRouted]);
  useLayoutEffect(() => {
    if (opensOtherTab) pageScrollRef.current?.hold();
  }, [opensOtherTab]);
  useLayoutEffect(() => {
    pageScrollRef.current?.setNavigating(isOpening);
  }, [isOpening]);

  useLayoutEffect(() => {
    if (motion.id === 0) return;
    // The page scrolls before the motion measures where the pages show.
    pageScrollRef.current?.follow(shownKey(), motion.change.content);
    const created = motionRef.current;
    if (created === null) return;
    const here = normalizeUrl(window.location.href);
    const snapshot = pendingRef.current?.claim(here, true) ?? null;
    created.play(snapshot, motion.change, motion.id);
  }, [motion]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pending.claim(normalizeUrl(window.location.href), false);
    pending.refresh();
  });

  const captureHistoryStep = useEffectEvent((to: string) => {
    capture(to, true);
  });
  useEffect(() => {
    if (view === null) return;
    const onScroll = () => {
      recapture();
    };
    view.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    const stopHistorySteps = onHistoryStep(captureHistoryStep);
    return () => {
      view.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scroll", onScroll);
      stopHistorySteps();
    };
  }, [view]);

  const leavingRef = useRef<string | null>(null);
  const pushedRef = useRef<{ from: string; to: string } | null>(null);
  const pressedRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    leavingRef.current = null;
  }, [deepest.key, deepestBack?.href]);

  const takeOff = (href: string) => {
    // The back link of a destination that still opens leads to this URL, and
    // this navigation ends the one that is pending.
    if (normalizeUrl(href) === normalizeUrl(window.location.href)) {
      replace(href);
      return;
    }
    if (leavingRef.current === window.location.href) return;
    leavingRef.current = window.location.href;
    capture(href);
    if (previousEntryUrl(pushedRef.current) === normalizeUrl(href)) {
      window.history.back();
    } else {
      replaceWaiting(href);
    }
  };

  const follow: SplitViewState["follow"] = (event, href, column) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    pressedRef.current = event.currentTarget;
    const target = normalizeUrl(href);
    if (target === normalizeUrl(window.location.href)) {
      // The router loads the page again on a link to the page that shows.
      if (!isRouted) event.preventDefault();
      return;
    }
    const backs = [content.back, detail?.back];
    if (
      backs.some((back) => back != null && normalizeUrl(back.href) === target)
    ) {
      event.preventDefault();
      takeOff(href);
      return;
    }
    const changesShownColumn =
      column === "sidebar"
        ? content.back != null
        : column === "content" && detail != null;
    capture(href);
    if (changesShownColumn) {
      event.preventDefault();
      replaceWaiting(href);
      return;
    }
    pushedRef.current = {
      from: normalizeUrl(window.location.href),
      to: target,
    };
  };

  useStackFocus(
    view,
    hasDetailColumn ? "detail" : showsStackRoot ? "sidebar" : "content",
    (hasDetailColumn ? detailColumn.key : content.key) ?? null,
  );
  const [drawerScroller, setDrawerScroller] = useState<HTMLElement | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  useColumnKeys(
    view,
    // Beside the content, the sidebar that a `back` leads to already shows.
    isPageSidebar || !stacks || detail != null ? deepestBack : null,
    takeOff,
    isContained,
  );
  useEdgeSwipe(view, motionRef, pageScrollRef, content.back ?? null, takeOff);

  const [lastSheet, setLastSheet] = useState<NavigationSplitViewDetail | null>(
    null,
  );
  if (asSheet && (lastSheet === null || lastSheet.key !== detail.key)) {
    setLastSheet(detail);
  }
  const sheet = asSheet ? detail : lastSheet;
  // A sheet can close after the URL changes, for example on Back. Then it
  // goes back into the link to the URL that it showed.
  const sheetHrefRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (asSheet) sheetHrefRef.current = window.location.href;
  });

  const viewState: SplitViewState = {
    linkComponent,
    linkStatus,
    setOpening,
    follow,
  };
  const closeOf = (back: SplitViewBackLink | null | undefined) =>
    back == null
      ? null
      : () => {
          takeOff(back.href);
        };

  const sidebarForms: readonly ("full" | "collapsed")[] = hasCollapsed
    ? ["full", "collapsed"]
    : ["full"];
  const dustOf = (form: "full" | "collapsed") => {
    if (folding === null) return null;
    return (folding === "fold") === (form === "full") ? "shed" : "pull";
  };
  const contentPages: ColumnPage[] = [
    ...(pages.under === null
      ? []
      : [{ ...pages.under, role: "under" as const }]),
    { key: content.key ?? "", column: content, role: "current" },
    ...(pages.leaving === null
      ? []
      : [{ ...pages.leaving, role: "leaving" as const }]),
  ];
  const shownDetail = detailColumn ?? goneDetail?.column ?? null;
  const detailPages: ColumnPage[] =
    shownDetail === null
      ? []
      : [
          { key: shownDetail.key ?? "", column: shownDetail, role: "current" },
          ...(details?.leaving == null
            ? []
            : [{ ...details.leaving, role: "leaving" as const }]),
        ];

  const leavingPage = pages.leaving;
  const leavingCopyKey =
    leavingPage === null ||
    leavingPage.leftAs === "skeleton" ||
    (leavingPage.leftAs === "blank" && fitsFullSidebar === false)
      ? null
      : leavingPage.key;
  const isSidebarShown = (form: "full" | "collapsed") => {
    if (stacks) return showsStackRoot || fitsFullSidebar !== false;
    if (form === "full") return !hasDetailColumn && fitsFullSidebar !== false;
    return (
      hasDetailColumn || (fitsCollapsed !== false && fitsFullSidebar !== true)
    );
  };

  const shown = (
    <SplitViewContext value={viewState}>
      <NavViewContext
        value={{ pendingHref: opening, isPage: isPageSidebar && stacks }}
      >
        <SplitViewMarksContext value={marks}>
          <div
            ref={setView}
            data-split-view=""
            css={[
              styles.view,
              !isContained && pageScrollStyles.view,
              movingMarker,
              hasSidebar && pageColumn.wide,
              css,
            ]}
          >
            {isRouted ? (
              <LeavingCopyTaker
                view={view}
                pageKey={content.key ?? ""}
                copyKey={leavingCopyKey}
                copyRef={leavingCopyRef}
              />
            ) : null}
            <div
              css={[
                islandSurface.frame,
                styles.columns,
                !isContained && pageScrollStyles.columns,
                !isInTabView && styles.columnsWithoutBar,
                fillsScreen && styles.columnsOnScreen,
                drawer !== null && styles.columnsWithMenu,
                !hasDetailColumn &&
                  (hasCollapsed
                    ? styles.stackedBelowCollapsed
                    : hasSidebar && styles.stackedBelowSidebar),
                hasSidebar &&
                  !hasDetailColumn &&
                  styles.fullSidebarBesideContent,
              ]}
            >
              {drawer !== null ? (
                <SplitViewColumnContext
                  value={{
                    column: "sidebar",
                    presentation: "column",
                    scroller: drawerScroller,
                    isShown: sidebarFits !== false || isDrawerOpen,
                    close: null,
                  }}
                >
                  <SidebarDrawer
                    label={drawer.label}
                    menuLabel={drawer.menuLabel}
                    closeLabel={drawer.closeLabel}
                    header={drawer.header}
                    footer={drawer.footer}
                    fits={sidebarFits}
                    isOpen={isDrawerOpen}
                    onOpenChange={setIsDrawerOpen}
                    isContained={isContained}
                    scrollerRef={setDrawerScroller}
                  >
                    {drawer.node}
                  </SidebarDrawer>
                </SplitViewColumnContext>
              ) : hasSidebar ? (
                sidebarForms.map((form) => (
                  <SplitViewDustContext key={form} value={dustOf(form)}>
                    <Column
                      column="sidebar"
                      form={form}
                      pageScrolls={pageScrolls}
                      canPageScroll={!isContained}
                      isShown={isSidebarShown(form)}
                      label={sidebar.label}
                      presentation={
                        stacks && sidebarFits !== true ? "page" : "column"
                      }
                      pages={[
                        {
                          key: sidebar.key ?? "",
                          role: "current",
                          stack: stacks
                            ? showsStackRoot
                              ? "root"
                              : "under"
                            : undefined,
                          column: {
                            ...sidebar,
                            node:
                              form === "full" ? sidebar.node : collapsedSidebar,
                          },
                        },
                      ]}
                      close={null}
                      css={[
                        sidebarStyles.base,
                        form === "full"
                          ? sidebarStyles.full
                          : sidebarStyles.collapsed,
                        sidebarShownStyle(form, hasDetailColumn),
                        stacks && stackStyles.sidebar,
                        stacks &&
                          (showsStackRoot
                            ? stackStyles.sidebarRoot
                            : [
                                sidebarStyles.fullBesideContent,
                                stackStyles.sidebarUnder,
                              ]),
                      ]}
                      contentCss={[
                        form === "full"
                          ? sidebarStyles.fullContent
                          : sidebarStyles.collapsedContent,
                        stacks && stackStyles.sidebarContent,
                      ]}
                    />
                  </SplitViewDustContext>
                ))
              ) : null}
              <Column
                column="content"
                as={fillsScreen ? "main" : "section"}
                pageScrolls={pageScrolls}
                canPageScroll={!isContained}
                isShown={!isAtStackRoot || fitsFullSidebar !== false}
                label={content.label}
                pages={contentPages}
                close={closeOf(content.back)}
                css={[
                  contentStyles.base,
                  stacks && stackStyles.contentColumn,
                  showsStackRoot && [
                    sidebarStyles.fullBesideContent,
                    stackStyles.contentAtRoot,
                  ],
                ]}
                pageCss={stacks && stackStyles.contentPage}
                scrollerCss={
                  stacks
                    ? content.back != null && stackStyles.swipes
                    : content.back != null && contentStyles.swipes
                }
                contentCss={contentStyles.inPageColumn}
                top={(page) => {
                  // The back link of a destination that still opens leads to
                  // this URL, and this navigation ends the one that is pending.
                  const back =
                    page.column.back ??
                    (stacks && depth === DEEP_DEPTH && page.role === "current"
                      ? {
                          href:
                            window.location.pathname + window.location.search,
                          label: sidebar.label,
                        }
                      : null);
                  if (back === null) return null;
                  const link = <BackLink back={back} onTakeOff={takeOff} />;
                  return stacks ? <StackedOnly>{link}</StackedOnly> : link;
                }}
                body={
                  !isRouted
                    ? undefined
                    : (page) =>
                        page.role === "leaving" ? (
                          <LeavingBody
                            page={page}
                            skeleton={skeleton}
                            copyRef={leavingCopyRef}
                          />
                        ) : (
                          <>
                            {waiting ? skeleton : null}
                            <div
                              data-split-view-node=""
                              onAnimationEnd={onAnimationEnd}
                              css={[
                                styles.node,
                                revealing && styles.reveal,
                                stacks &&
                                  opensContent &&
                                  depth === DEEP_DEPTH &&
                                  stackStyles.nodeHiddenWhileStacked,
                                waiting && styles.nodeHidden,
                              ]}
                            >
                              {page.column.node}
                            </div>
                          </>
                        )
                }
              />
              {shownDetail === null ? null : (
                <Column
                  column="detail"
                  pageScrolls={pageScrolls}
                  canPageScroll={!isContained}
                  isShown
                  label={shownDetail.label}
                  isLeaving={detailColumn === null}
                  pages={detailPages}
                  close={
                    detailColumn === null ? null : closeOf(shownDetail.back)
                  }
                  header={
                    <DetailHeader
                      back={shownDetail.back}
                      label={shownDetail.label}
                      closeLabel={shownDetail.closeLabel}
                      onClose={() => {
                        takeOff(shownDetail.back.href);
                      }}
                    />
                  }
                  css={[
                    detailStyles.base,
                    detailColumn === null && detailStyles.leaving,
                  ]}
                  contentCss={[contentStyles.gutters, detailStyles.content]}
                />
              )}
            </div>
            <div ref={setLayer} aria-hidden inert css={styles.flights} />
          </div>
          <SheetRecedeContext value={view}>
            <Sheet
              isOpen={asSheet}
              onClose={() => {
                if (sheet !== null) takeOff(sheet.back.href);
              }}
              closeLabel={sheet?.closeLabel ?? ""}
              aria-label={sheet?.label ?? ""}
              liftFrom={() => {
                const pressed = pressedRef.current;
                pressedRef.current = null;
                const href = asSheet
                  ? window.location.href
                  : sheetHrefRef.current;
                return view === null ? null : liftOrigin(view, pressed, href);
              }}
            >
              {sheet === null ? null : (
                <SplitViewColumnContext
                  value={{
                    column: "detail",
                    presentation: "sheet",
                    scroller: null,
                    isShown: true,
                    close: closeOf(sheet.back),
                  }}
                >
                  {sheet.node}
                </SplitViewColumnContext>
              )}
            </Sheet>
          </SheetRecedeContext>
        </SplitViewMarksContext>
      </NavViewContext>
    </SplitViewContext>
  );
  return fillsScreen ? <div css={styles.screen}>{shown}</div> : shown;
}

/**
 * How deep each screen of a stack is, so that a change of it pushes or pops:
 * a URL with no sidebar is 0, the sidebar as a page, and the content over it.
 */
const STACK_ROOT_DEPTH = 1;
const DEEP_DEPTH = 2;

function pageOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column, motion: number): SplitViewPage<Column> {
  return { key: column.key ?? "", column, deep: column.back != null, motion };
}

function pagesOf<
  Column extends NavigationSplitViewColumn | NavigationSplitViewDetail,
>(column: Column): SplitViewPages<Column> {
  return { under: null, current: pageOf(column, 0), leaving: null };
}

/**
 * Calls `onStep` with the URL that Back or Forward of the browser goes to,
 * before the router changes the DOM. Gives the cleanup.
 */
function onHistoryStep(onStep: (to: string) => void) {
  // React commits the router's transition of a popstate event before the
  // next popstate listener runs. The navigate event comes before popstate.
  const navigation = "navigation" in window ? window.navigation : null;
  if (navigation !== null) {
    const onNavigate = (event: NavigateEvent) => {
      if (event.navigationType === "traverse") onStep(event.destination.url);
    };
    navigation.addEventListener("navigate", onNavigate);
    return () => {
      navigation.removeEventListener("navigate", onNavigate);
    };
  }
  const onPopState = () => {
    onStep(window.location.href);
  };
  window.addEventListener("popstate", onPopState, { capture: true });
  return () => {
    window.removeEventListener("popstate", onPopState, { capture: true });
  };
}

function replaceLocation(href: string) {
  window.location.replace(href);
}

/**
 * The URL of the history entry before this one, where the browser tells it,
 * and else where a column link of the view pushed this entry.
 */
function previousEntryUrl(pushed: { from: string; to: string } | null) {
  if ("navigation" in window && window.navigation.currentEntry !== null) {
    const index = window.navigation.currentEntry.index;
    const url = index > 0 ? window.navigation.entries()[index - 1]?.url : null;
    return url == null ? null : normalizeUrl(url);
  }
  return pushed !== null && pushed.to === normalizeUrl(window.location.href)
    ? pushed.from
    : null;
}

/** The widths of a view, in rem and in order, where its columns change. */
const VIEW_WIDTHS_REM = [
  STACKED_BELOW_REM,
  STACK_PAGE_BELOW_REM,
  DETAIL_BESIDE_MIN_REM,
];

/** How many of `VIEW_WIDTHS_REM` the view reaches: `null` until it is measured. */
function useViewWidthsReached(view: HTMLElement | null) {
  const [reached, setReached] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (view === null || typeof ResizeObserver === "undefined") return;
    const remPerPx = pxToRem(1);
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.borderBoxSize[0].inlineSize;
      if (width === 0) return;
      setReached(
        VIEW_WIDTHS_REM.filter((rem) => width * remPerPx >= rem).length,
      );
    });
    observer.observe(view);
    return () => {
      observer.disconnect();
    };
  }, [view]);
  return reached;
}

/** Where the full or the collapsed sidebar shows, each a column of its own. */
function sidebarShownStyle(form: "full" | "collapsed", hasDetail: boolean) {
  if (hasDetail) {
    return form === "full"
      ? sidebarStyles.hidden
      : sidebarStyles.collapsedBesideDetail;
  }
  return form === "full"
    ? sidebarStyles.fullBesideContent
    : sidebarStyles.collapsedBesideContent;
}

function isShown(element: Element) {
  return isRendered(element, { visibilityProperty: true });
}

/** True where an arrow key moves inside a control, such as a radio group. */
function ownsArrowKeys(target: Element | null) {
  return (
    target?.closest(
      "[role=radiogroup], [role=tablist], [role=slider], [role=menu], [role=menubar], [role=listbox], [role=grid], [role=tree], [role=toolbar]",
    ) != null
  );
}

/**
 * Moves focus to the next or the previous column link in the column that
 * has focus, or else in the deepest column that has links. False where
 * there is no link to move to.
 */
function moveFocus(view: HTMLElement, target: Element | null, step: 1 | -1) {
  const ownColumns = [
    ...view.querySelectorAll<HTMLElement>(
      ":scope > * > [data-split-view-column]",
    ),
  ];
  const focused = ownColumns.find((column) => column.contains(target));
  const columns = focused ? [focused] : ownColumns.reverse();
  for (const column of columns) {
    if (!isShown(column)) continue;
    const links = [
      ...column.querySelectorAll<HTMLElement>("[data-split-view-link]"),
    ].filter(
      (link) => link.closest("[data-split-view]") === view && isShown(link),
    );
    if (links.length === 0) continue;
    const current = links.findIndex(
      (link) => target !== null && link.contains(target),
    );
    const next =
      current === -1
        ? step === 1
          ? 0
          : links.length - 1
        : Math.min(links.length - 1, Math.max(0, current + step));
    links[next].focus();
    return true;
  }
  return false;
}

/**
 * Scrolls the content for a key that scrolls, where nothing has focus. A browser
 * scrolls the page for such a key, and the page does not scroll here. False where
 * the key does not scroll the column, so the browser takes it.
 */
function scrollContentByKey(view: HTMLElement, event: KeyboardEvent) {
  const scroller = currentContentScroller(view);
  if (scroller === null || !scrollsBlock(scroller)) return false;
  const page = scroller.clientHeight * PAGE_KEY_SHARE;
  const backward = event.shiftKey ? -1 : 1;
  const top = {
    ArrowDown: ARROW_KEY_STEP,
    ArrowUp: -ARROW_KEY_STEP,
    PageDown: page,
    PageUp: -page,
    " ": page * backward,
    End: scroller.scrollHeight,
    Home: -scroller.scrollHeight,
  }[event.key];
  if (top === undefined) return false;
  scroller.scrollBy({
    top,
    behavior: event.key.startsWith("Arrow") ? "instant" : getScrollBehavior(),
  });
  return true;
}

/** The keys of the view. See `NavigationSplitView`. */
function useColumnKeys(
  view: HTMLElement | null,
  deepestBack: SplitViewBackLink | null,
  takeOff: (href: string) => void,
  isContained: boolean,
) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (view === null || event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const hasNoFocus = target === null || target === document.body;
    if (hasNoFocus ? isContained : !view.contains(target)) return;
    if (hasNoFocus && scrollContentByKey(view, event)) {
      event.preventDefault();
      return;
    }
    if (isTyping(target)) return;
    if (document.querySelector("[aria-modal=true]") !== null) return;
    switch (event.key) {
      case "Escape":
      case "ArrowLeft": {
        if (deepestBack === null) return;
        if (event.key === "ArrowLeft" && ownsArrowKeys(target)) return;
        event.preventDefault();
        takeOff(deepestBack.href);
        return;
      }
      case "ArrowRight": {
        if (
          target instanceof HTMLElement &&
          target.matches("[data-split-view-link]")
        ) {
          event.preventDefault();
          target.click();
        }
        return;
      }
      case "j":
      case "J":
      case "k":
      case "K": {
        const step = event.key.toLowerCase() === "j" ? 1 : -1;
        if (moveFocus(view, target, step)) event.preventDefault();
        return;
      }
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
    };
  }, []);
}

/**
 * Keeps focus in the view when the deepest column changes. A column that
 * covers the focused element takes focus, and when the detail goes, focus
 * goes back to the element that opened it.
 */
function useStackFocus(
  view: HTMLElement | null,
  column: SplitViewColumnState["column"],
  key: string | null,
) {
  const shownRef = useRef({ column, key });
  const triggerRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const previous = shownRef.current;
    if (view === null || (previous.column === column && previous.key === key))
      return;
    shownRef.current = { column, key };
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const isPush =
      (column === "detail" && previous.column !== "detail") ||
      (column === "content" && previous.column === "sidebar");
    if (isPush && active !== null && view.contains(active)) {
      triggerRef.current = active;
    }
    if (active !== null && active !== document.body && isShown(active)) {
      return;
    }
    const trigger =
      triggerRef.current === null
        ? null
        : findTwinElement(triggerRef.current, view);
    if (!isPush && trigger !== null && isShown(trigger)) {
      trigger.focus({ preventScroll: true });
      return;
    }
    view
      .querySelector<HTMLElement>(
        `:scope > * > [data-split-view-column="${column}"]`,
      )
      ?.focus({ preventScroll: true });
  }, [view, column, key]);
}

/** One page of a column, and its part in the motion. */
interface ColumnPage {
  key: string;
  role: "under" | "current" | "leaving";
  column: NavigationSplitViewColumn | NavigationSplitViewDetail;
  /** The part of the page in the stack, where it is the sidebar at its root. */
  stack?: "root" | "under";
  leftAs?: "skeleton" | "blank";
}

interface ColumnProps {
  column: SplitViewColumnState["column"];
  /** The form of the sidebar, for a sidebar column. */
  form?: "full" | "collapsed";
  /** The landmark of the column. */
  as?: "main" | "section";
  /** Whether the page scrolls the column instead of its scroller. */
  pageScrolls: boolean;
  /** Whether the view can leave the scroll of the column to the page. */
  canPageScroll: boolean;
  /** Whether the view shows the column now, for `useSplitViewColumn`. */
  isShown: boolean;
  /** How the column shows, for `useSplitViewColumn`. */
  presentation?: "column" | "page";
  label: string;
  /**
   * The pages of the column, by key: the page that shows, and the pages
   * that a motion still shows. Each page keeps its scroll while it stays.
   */
  pages: readonly ColumnPage[];
  close: (() => void) | null;
  /** Whether the column leaves the view, and shows only while it moves out. */
  isLeaving?: boolean;
  header?: ReactNode;
  /** What a page shows above its node, such as its back link. */
  top?: (page: ColumnPage) => ReactNode;
  /** What a page shows, where that is not its node. */
  body?: (page: ColumnPage) => ReactNode;
  css: StyleProp;
  pageCss?: StyleProp;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
}

function Column({
  column,
  form,
  as: Landmark = "section",
  pageScrolls,
  canPageScroll,
  isShown,
  presentation = "column",
  label,
  pages,
  close,
  isLeaving = false,
  header,
  top,
  body,
  css,
  pageCss,
  scrollerCss,
  contentCss,
}: ColumnProps) {
  return (
    <Landmark
      aria-label={label}
      tabIndex={-1}
      inert={isLeaving}
      data-split-view-column={column}
      data-split-view-sidebar={form}
      {...stylex.props(
        islandSurface.base,
        styles.column,
        a11y.focusRingInset,
        css,
      )}
    >
      {header}
      <div data-split-view-pages="" css={styles.pages}>
        {pages.map((page) => (
          <ColumnPageView
            key={page.key}
            column={column}
            pageScrolls={pageScrolls}
            canPageScroll={canPageScroll}
            isShown={isShown}
            presentation={presentation}
            page={page}
            close={page.role === "current" ? close : null}
            pageCss={pageCss}
            scrollerCss={scrollerCss}
            contentCss={contentCss}
            top={top}
            body={body}
          />
        ))}
      </div>
      {column === "sidebar" ? null : (
        <span data-split-view-edge="" aria-hidden css={styles.edge} />
      )}
    </Landmark>
  );
}

function ColumnPageView({
  column,
  pageScrolls,
  canPageScroll,
  isShown,
  presentation,
  page,
  close,
  pageCss,
  scrollerCss,
  contentCss,
  top,
  body,
}: {
  column: SplitViewColumnState["column"];
  pageScrolls: boolean;
  canPageScroll: boolean;
  isShown: boolean;
  presentation: "column" | "page";
  page: ColumnPage;
  close: (() => void) | null;
  pageCss?: StyleProp;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  top?: (page: ColumnPage) => ReactNode;
  body?: (page: ColumnPage) => ReactNode;
}) {
  const [box, setBox] = useState<HTMLElement | null>(null);
  const scroller = pageScrolls ? undefined : box;
  const isCurrent = page.role === "current";
  const accessory = "accessory" in page.column ? page.column.accessory : null;
  return (
    <div
      data-split-view-page={page.role}
      data-split-view-page-key={
        page.stack === undefined ? page.key : STACK_ROOT_KEY
      }
      data-split-view-stack={page.stack}
      inert={!isCurrent}
      aria-hidden={isCurrent ? undefined : true}
      css={[
        styles.page,
        canPageScroll && pageScrollStyles.page,
        !isCurrent && styles.pageAside,
        !isCurrent && canPageScroll && pageScrollStyles.pageAside,
        pageCss,
      ]}
    >
      <SplitViewColumnContext
        value={{ column, presentation, scroller, isShown, close }}
      >
        <RegionScroller
          scrollerRef={setBox}
          scrollerCss={[
            canPageScroll && pageScrollStyles.scroller,
            scrollerCss,
          ]}
          contentCss={[canPageScroll && pageScrollStyles.content, contentCss]}
        >
          {top?.(page)}
          {body === undefined ? page.column.node : body(page)}
          {accessory == null ? null : <Accessory>{accessory}</Accessory>}
        </RegionScroller>
      </SplitViewColumnContext>
      <span data-split-view-dim="" aria-hidden css={styles.dim} />
      <span data-split-view-edge="" aria-hidden css={styles.edge} />
    </div>
  );
}

/**
 * What a page shows while it leaves, where the router cannot show its old
 * content: the skeleton it showed, or a copy of its DOM. A page that had just
 * started to wait is blank while stacked, where it opened over the sidebar.
 */
function LeavingBody({
  page,
  skeleton,
  copyRef,
}: {
  page: ColumnPage;
  skeleton: ReactNode;
  copyRef: RefObject<LeavingCopy | null>;
}) {
  if (page.leftAs === "skeleton") return skeleton;
  return (
    <div
      ref={(host) => {
        const copy = copyRef.current;
        if (host !== null && copy?.key === page.key) {
          copyRef.current = null;
          host.replaceChildren(copy.nodes);
          const scroller = host.closest(
            "[data-split-view-page]",
          )?.firstElementChild;
          if (scroller != null) scroller.scrollTop = copy.top;
        }
      }}
      css={[
        styles.node,
        page.leftAs === "blank" && stackStyles.nodeHiddenWhileStacked,
      ]}
    />
  );
}

/**
 * The swipe back from the inline-start edge of the content, where the
 * content fills the view, as on a phone. The screen follows the finger, and
 * the swipe goes back where it is let go far enough or fast enough. Else
 * the screen springs back in.
 */
function useEdgeSwipe(
  view: HTMLElement | null,
  motionRef: RefObject<SplitViewMotion | null>,
  pageScrollRef: RefObject<PageScroll | null>,
  back: SplitViewBackLink | null,
  takeOff: (href: string) => void,
) {
  const goBack = useEffectEvent(() => {
    if (back !== null) takeOff(back.href);
  });
  const canSwipe = useEffectEvent(() => back !== null);
  useEffect(() => {
    if (view === null) return;
    let swipe: {
      pointerId: number;
      column: HTMLElement;
      startX: number;
      startY: number;
      width: number;
      isActive: boolean;
      samples: DragSample[];
    } | null = null;
    const content = () =>
      view.querySelector<HTMLElement>(
        ':scope > * > [data-split-view-column="content"]',
      );
    const onDown = (event: PointerEvent) => {
      if (swipe !== null || !event.isPrimary || event.button !== 0) return;
      if (!canSwipe()) return;
      const column = content();
      if (column === null || !(event.target instanceof Node)) return;
      if (!column.contains(event.target)) return;
      swipe = {
        pointerId: event.pointerId,
        column,
        startX: event.clientX,
        startY: event.clientY,
        width: 0,
        isActive: false,
        samples: [],
      };
    };
    // The layout is read only for a press that moves, so a tap costs nothing.
    const startsAtEdge = (started: NonNullable<typeof swipe>) => {
      if (!isViewStacked(view)) return false;
      const box = started.column.getBoundingClientRect();
      started.width = box.width;
      return started.startX - box.left <= EDGE_SWIPE_ZONE;
    };
    const onMove = (event: PointerEvent) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const dx = event.clientX - swipe.startX;
      if (!swipe.isActive) {
        const decision = claimEdgeSwipe(dx, event.clientY - swipe.startY);
        if (decision === "wait") return;
        if (decision === "release" || !startsAtEdge(swipe)) {
          swipe = null;
          return;
        }
        pageScrollRef.current?.align();
        if (motionRef.current?.beginSwipe() !== true) {
          swipe = null;
          return;
        }
        swipe.isActive = true;
        try {
          view.setPointerCapture(event.pointerId);
        } catch {
          // A pointer that is gone cannot be captured, and the swipe goes on.
        }
      }
      swipe.samples.push({ time: performance.now(), y: event.clientX });
      if (swipe.samples.length > 12) swipe.samples.shift();
      motionRef.current?.drag(1 - Math.min(1, Math.max(0, dx / swipe.width)));
    };
    const onUp = (event: PointerEvent, canPop: boolean) => {
      if (swipe === null || event.pointerId !== swipe.pointerId) return;
      const ended = swipe;
      swipe = null;
      if (!ended.isActive) return;
      const velocity = releaseVelocity(ended.samples, performance.now());
      const pop =
        canPop &&
        shouldPop(event.clientX - ended.startX, velocity, ended.width);
      motionRef.current?.release(pop, (-velocity * 1000) / ended.width);
      swipedAt = performance.now();
      if (pop) goBack();
    };
    // The click that ends a swipe must not follow the link under it.
    let swipedAt = Number.NEGATIVE_INFINITY;
    const onClick = (event: Event) => {
      if (performance.now() - swipedAt > 300) return;
      swipedAt = Number.NEGATIVE_INFINITY;
      event.preventDefault();
      event.stopPropagation();
    };
    const onPointerUp = (event: PointerEvent) => {
      onUp(event, true);
    };
    const onCancel = (event: PointerEvent) => {
      onUp(event, false);
    };
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    view.addEventListener("pointerup", onPointerUp);
    view.addEventListener("pointercancel", onCancel);
    view.addEventListener("click", onClick, { capture: true });
    return () => {
      view.removeEventListener("click", onClick, { capture: true });
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      view.removeEventListener("pointerup", onPointerUp);
      view.removeEventListener("pointercancel", onCancel);
    };
  }, [view, motionRef, pageScrollRef]);
}

function RegionScroller({
  scrollerRef,
  scrollerCss,
  contentCss,
  children,
}: {
  scrollerRef: RefCallback<HTMLElement>;
  scrollerCss?: StyleProp;
  contentCss: StyleProp;
  children: ReactNode;
}) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  return (
    <div
      ref={mergeRefs<HTMLDivElement>(scroller, scrollerRef)}
      css={[styles.scroller, a11y.focusRingInset, scrollerCss]}
    >
      <div ref={content} css={[styles.content, contentCss]}>
        <EffectCarrier value={region}>{children}</EffectCarrier>
      </div>
    </div>
  );
}

function Accessory({ children }: { children: ReactNode }) {
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div ref={ref} css={[styles.accessory, css]}>
      <EffectCarrier value={sticky}>
        <div css={styles.accessoryControl}>{children}</div>
      </EffectCarrier>
    </div>
  );
}

function BackLink({
  back,
  onTakeOff,
}: {
  back: SplitViewBackLink;
  onTakeOff: (href: string) => void;
}) {
  const view = use(SplitViewContext);
  const LinkComponent = view?.linkComponent ?? PlainAnchor;
  return (
    <div css={styles.back}>
      <LinkComponent
        href={back.href}
        onClick={(event) => {
          if (event.defaultPrevented || !isPlainClick(event)) return;
          event.preventDefault();
          onTakeOff(back.href);
        }}
        {...stylex.props(
          typeRole.label,
          a11y.touchTarget,
          a11y.focusRing,
          corner.radius_1,
          styles.backLink,
        )}
      >
        <CaretLeftIcon weight="bold" aria-hidden />
        {back.label}
      </LinkComponent>
    </div>
  );
}

function DetailHeader({
  back,
  label,
  closeLabel,
  onClose,
}: {
  back: SplitViewBackLink;
  label: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div css={styles.detailHeader}>
      <p css={[typeRole.label, styles.breadcrumb]}>
        <span css={truncate.base}>{back.label}</span>
        <CaretRightIcon weight="bold" aria-hidden />
        <span css={styles.breadcrumbCurrent}>{label}</span>
      </p>
      <Button
        look="ghost"
        size="sm"
        icon={<XIcon weight="bold" />}
        aria-label={closeLabel}
        onClick={onClose}
        css={styles.close}
      />
    </div>
  );
}

const CONTENT_GUTTER_START = `max(${space._4}, env(safe-area-inset-left))`;
const CONTENT_GUTTER_END = `max(${space._4}, env(safe-area-inset-right))`;
const PAGE_COLUMN_MARGIN = `calc((100% - ${pageColumnTokens.inlineSize}) / 2 + ${space._4})`;
/** The view keeps the islands clear of the status bar, except where the content fills it. */
const CONTENT_PADDING_BLOCK_START = `calc(${space._4} + max(0px, env(safe-area-inset-top) - ${islandTokens.insetBlockStart}))`;
const CONTENT_PADDING_BLOCK_END = `calc(${space._6} + ${splitViewTokens.columnInsetBlockEnd})`;
/** Above the tab bar below `md`, and above the safe area from `md` up. */
const ACCESSORY_INSET_BLOCK_END = `max(calc(${space._3} + ${tabViewTokens.barClearance}), calc(${space._5} + env(safe-area-inset-bottom)))`;

const styles = stylex.create({
  // The box of the view that fills the screen, for `splitViewQueries.pageScrolls`,
  // as a `TabView` is the box of a view in it.
  screen: {
    containerName: "split-view-screen",
    containerType: "inline-size",
  },
  // The view fills the screen and the page does not scroll, except on a screen
  // narrower than 30rem. Inside a `TabView` below `md`, the view goes under the
  // floating tab bar, and each column keeps its content above the bar. The
  // displays start again from their defaults in a view in a column of another.
  view: {
    position: "relative",
    containerType: "inline-size",
    blockSize: "100dvh",
    maxBlockSize: "100%",
    [splitViewDisplay.stacked]: "none",
    [splitViewDisplay.unstacked]: "contents",
    [splitViewDisplay.noFullSidebar]: "contents",
  },
  // The copies of the Shared elements fly over the columns.
  flights: {
    position: "absolute",
    inset: 0,
    zIndex: layer.raised,
    overflow: "clip",
    pointerEvents: "none",
  },
  // Each column is an island on the canvas. Where the content fills the
  // view, as on a phone, the islands have no gaps and no corners.
  columns: {
    [islandTokens.radius]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetBlockEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    [islandTokens.insetInlineEnd]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
    },
    // The part of the bar or of the safe area that the gap under the
    // islands does not already clear.
    [splitViewTokens.columnInsetBlockEnd]: `max(0px, max(${tabViewTokens.barClearance}, env(safe-area-inset-bottom)) - ${islandTokens.insetBlockEnd})`,
    position: "relative",
    blockSize: "100%",
    overflow: "clip",
  },
  columnsWithoutBar: {
    [tabViewTokens.barClearance]: "0px",
  },
  // No rail of a `TabView` takes the safe area at the inline start.
  columnsOnScreen: {
    [islandTokens.insetInlineStart]: {
      default: null,
      [splitViewQueries.contentAlone]: "0px",
      [splitViewQueries.besideOthers]: `max(${rhythm.tight}, env(safe-area-inset-left))`,
    },
  },
  // The room of the menu button of a drawer, which floats over the page.
  columnsWithMenu: {
    [headerControlsTokens.clearance]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: `calc(${controlHeight.md} + 2 * ${space._3} + env(safe-area-inset-top))`,
    },
    [headerControlsTokens.inlineEndClearance]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: `calc(${controlHeight.md} + ${rhythm.tight})`,
    },
  },
  fullSidebarBesideContent: {
    [splitViewDisplay.noFullSidebar]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: "none",
    },
  },
  // A custom property set in a container query goes into a cascade layer, and one
  // set without a condition does not. Thus these set a display of
  // `splitViewDisplay` only in a container query, and the default comes from `view`.
  stackedBelowCollapsed: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
    },
  },
  stackedBelowSidebar: {
    [splitViewDisplay.stacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "contents",
      [splitViewQueries.contentBesideCollapsed]: "contents",
    },
    [splitViewDisplay.unstacked]: {
      default: null,
      [splitViewQueries.contentAlone]: "none",
      [splitViewQueries.contentBesideCollapsed]: "none",
    },
  },
  column: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  // The pages of a column lie on top of each other, and a motion moves
  // them inside the column.
  pages: {
    position: "relative",
    flexGrow: 1,
    minBlockSize: 0,
    overflow: "clip",
  },
  page: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    isolation: "isolate",
  },
  // A page under the one that shows, or one that leaves, keeps its scroll
  // and shows only while a motion moves it.
  pageAside: {
    position: "absolute",
    visibility: "hidden",
    contentVisibility: "hidden",
  },
  dim: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    backgroundColor: color.bgScrim,
    opacity: 0,
    pointerEvents: "none",
  },
  // The shadow at the inline-start edge of a page or a column while it
  // moves in over the one under it.
  edge: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    boxShadow: shadow._5,
    clipPath: "inset(-100% 0 -100% -100%)",
    opacity: 0,
    pointerEvents: "none",
  },
  scroller: {
    flexGrow: 1,
    minBlockSize: 0,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    minBlockSize: "100%",
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingBlockEnd: CONTENT_PADDING_BLOCK_END,
  },
  node: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
  },
  // A node can mount while it is hidden, and it must lay out, as a component can
  // measure itself once as it mounts.
  nodeHidden: {
    flexGrow: 0,
    blockSize: 0,
    overflow: "clip",
    visibility: "hidden",
  },
  reveal: {
    animationName: {
      default: motionKeyframes.fadeIn,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  stackedOnly: {
    display: splitViewDisplay.stacked,
  },
  unlessStacked: {
    display: splitViewDisplay.unstacked,
  },
  unlessFullSidebar: {
    display: splitViewDisplay.noFullSidebar,
  },
  back: {
    display: "flex",
    marginBlockEnd: rhythm.tight,
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    color: color.fgMuted,
    textDecoration: "none",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
    paddingBlockStart: CONTENT_PADDING_BLOCK_START,
    paddingInlineStart: CONTENT_GUTTER_START,
    paddingInlineEnd: `max(${space._2}, env(safe-area-inset-right))`,
  },
  // The close button overhangs the line of the breadcrumb, so that the
  // breadcrumb sits on the line of the content's back link, and the detail's
  // first line on the line of the content's title.
  close: {
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
    margin: 0,
    color: color.fgMuted,
  },
  breadcrumbCurrent: {
    flexShrink: 0,
  },
  // The accessory sticks to the bottom of the scroller, or of the screen
  // where the page scrolls. At the end of the content, its place in the flow
  // is the room the column keeps for it, and the negative margin puts that
  // place where the accessory sticks.
  accessory: {
    position: "sticky",
    insetBlockEnd: ACCESSORY_INSET_BLOCK_END,
    zIndex: layer.raised,
    display: "flex",
    justifyContent: "flex-end",
    marginBlockStart: "auto",
    marginBlockEnd: `calc(${ACCESSORY_INSET_BLOCK_END} - ${CONTENT_PADDING_BLOCK_END})`,
    paddingBlockStart: rhythm.item,
    pointerEvents: "none",
  },
  accessoryControl: {
    pointerEvents: "auto",
  },
});

// Where the view fills a screen narrower than 30rem, the page scrolls the
// content, and it does so also on paper, which has no scroller to show the rest.
// A view in a box that does not fill the screen always scrolls its columns, as
// the page does not scroll them, though a view around it can scroll with the page.
const pageScrollStyles = stylex.create({
  view: {
    blockSize: {
      default: "100dvh",
      [splitViewQueries.pageScrolls]: "auto",
      "@media print": "auto",
    },
    maxBlockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "none",
      "@media print": "none",
    },
    // `createPageScroll` sets the scroll and moves the pages with `top`. WebKit
    // anchors the scroll through both, and adds the move to the scroll.
    overflowAnchor: {
      default: null,
      [splitViewQueries.pageScrolls]: "none",
    },
  },
  columns: {
    blockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "auto",
      "@media print": "auto",
    },
  },
  // The page that shows is in the flow.
  page: {
    position: {
      default: "absolute",
      [splitViewQueries.pageScrolls]: "relative",
      "@media print": "relative",
    },
  },
  // A page beside it is as tall as its content, and `createPageScroll` moves it
  // to show its scroll.
  pageAside: {
    position: "absolute",
    insetBlockEnd: { default: null, [splitViewQueries.pageScrolls]: "auto" },
  },
  scroller: {
    overflowY: {
      default: "auto",
      [splitViewQueries.pageScrolls]: "visible",
      "@media print": "visible",
    },
  },
  content: {
    minBlockSize: {
      default: "100%",
      [splitViewQueries.pageScrolls]: "100dvh",
      "@media print": "auto",
    },
  },
});

// A hidden column leaves the flow but keeps its box, its width and its
// scroll, so that it shows again as it was.
const sidebarStyles = stylex.create({
  base: {
    flexShrink: 0,
  },
  full: {
    inlineSize: splitViewTokens.sidebarInlineSize,
  },
  collapsed: {
    inlineSize: splitViewWidths.collapsedSidebar,
  },
  fullContent: {
    paddingInline: space._3,
  },
  collapsedContent: {
    paddingInline: space._1,
  },
  hidden: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: islandTokens.insetInlineStart,
    visibility: "hidden",
  },
  collapsedBesideDetail: {
    position: "relative",
    visibility: "visible",
  },
  fullBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideSidebar]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
  collapsedBesideContent: {
    position: {
      default: "absolute",
      [splitViewQueries.contentBesideCollapsed]: "relative",
    },
    insetBlockStart: {
      default: islandTokens.insetBlockStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetBlockEnd: {
      default: islandTokens.insetBlockEnd,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    insetInlineStart: {
      default: islandTokens.insetInlineStart,
      [splitViewQueries.contentBesideCollapsed]: "auto",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideCollapsed]: "visible",
    },
  },
});

const contentStyles = stylex.create({
  base: {
    position: "relative",
    flexGrow: 1,
    flexBasis: 0,
    inlineSize: "100%",
  },
  gutters: {
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
    },
  },
  inPageColumn: {
    paddingInlineStart: {
      default: `max(${CONTENT_GUTTER_START}, ${PAGE_COLUMN_MARGIN})`,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
    },
    paddingInlineEnd: {
      default: `max(${CONTENT_GUTTER_END}, ${PAGE_COLUMN_MARGIN})`,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
    },
  },
  // A swipe from the inline-start edge goes back, so the browser takes only
  // the scroll and the zoom of a touch.
  swipes: {
    touchAction: {
      default: null,
      [splitViewQueries.contentAlone]: "pan-y pinch-zoom",
    },
  },
});

// A sidebar that is a page of the stack: below the width where it fits beside
// the content, it fills the frame, and the content shows over it. The screens
// of a motion move inside the content column, so the column has no fill of its
// own there, and each page has it.
const stackStyles = stylex.create({
  // A row of a page has no current look, and it opens in place of the page. The
  // sidebar is the container of the look of a `NavList` only while it is a page.
  sidebar: {
    [color.bgControlSelected]: {
      default: null,
      [splitViewQueries.noSidebarBeside]: "transparent",
    },
    [listRowTokens.caretDisplay]: {
      default: null,
      [splitViewQueries.contentBesideSidebar]: "none",
    },
    containerName: {
      default: "split-view-page",
      [splitViewQueries.contentBesideSidebar]: "none",
    },
    containerType: {
      default: "inline-size",
      [splitViewQueries.contentBesideSidebar]: "normal",
    },
  },
  sidebarRoot: {
    position: "relative",
    insetBlockStart: "auto",
    insetBlockEnd: "auto",
    insetInlineStart: "auto",
    inlineSize: {
      default: "100%",
      [splitViewQueries.contentBesideSidebar]:
        splitViewTokens.sidebarInlineSize,
    },
    visibility: "visible",
  },
  // After `sidebarStyles.fullBesideContent`.
  sidebarUnder: {
    insetInlineEnd: {
      default: islandTokens.insetInlineEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    inlineSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]:
        splitViewTokens.sidebarInlineSize,
    },
  },
  sidebarContent: {
    paddingInlineStart: {
      default: CONTENT_GUTTER_START,
      [splitViewQueries.contentAlone]: pageGutter.inlineStart,
      [splitViewQueries.contentBesideSidebar]: space._3,
    },
    paddingInlineEnd: {
      default: CONTENT_GUTTER_END,
      [splitViewQueries.contentAlone]: pageGutter.inlineEnd,
      [splitViewQueries.contentBesideSidebar]: space._3,
    },
  },
  contentColumn: {
    backgroundColor: {
      default: "transparent",
      [splitViewQueries.contentBesideSidebar]: color.bgSurfaceSunken,
    },
  },
  contentPage: {
    backgroundColor: {
      default: color.bgSurfaceSunken,
      [splitViewQueries.contentBesideSidebar]: null,
    },
  },
  // After `sidebarStyles.fullBesideContent`.
  contentAtRoot: {
    insetInlineEnd: {
      default: islandTokens.insetInlineEnd,
      [splitViewQueries.contentBesideSidebar]: "auto",
    },
    inlineSize: {
      default: "auto",
      [splitViewQueries.contentBesideSidebar]: "100%",
    },
  },
  nodeHiddenWhileStacked: {
    flexGrow: { default: 0, [splitViewQueries.contentBesideSidebar]: 1 },
    blockSize: { default: 0, [splitViewQueries.contentBesideSidebar]: "auto" },
    overflow: {
      default: "clip",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
    visibility: {
      default: "hidden",
      [splitViewQueries.contentBesideSidebar]: "visible",
    },
  },
  swipes: {
    touchAction: {
      default: "pan-y pinch-zoom",
      [splitViewQueries.contentBesideSidebar]: null,
    },
  },
});

const detailStyles = stylex.create({
  // Below `detailBeside`, the view shows the detail in a sheet. The column
  // shows there only for the first frame, before the view measures itself,
  // and it then stays out of the way.
  base: {
    display: { default: "none", [splitViewQueries.detailBeside]: "flex" },
    position: "relative",
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: splitViewWidths.detail,
  },
  // The header above the scroller keeps clear of the safe area.
  content: {
    paddingBlockStart: rhythm.tight,
  },
  // The detail that goes leaves the flow at once, so the content takes its
  // width, and it shows only while it moves out.
  leaving: {
    position: "absolute",
    insetBlockStart: islandTokens.insetBlockStart,
    insetBlockEnd: islandTokens.insetBlockEnd,
    insetInlineStart: "auto",
    insetInlineEnd: islandTokens.insetInlineEnd,
    inlineSize: splitViewWidths.detail,
    visibility: "hidden",
    // Over the content, which takes a fill while it moves.
    zIndex: 2,
  },
});
