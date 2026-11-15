"use client";

import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useState,
  type ComponentType,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  PlainAnchor,
  TabBar,
  type TabBarItem,
  type TabBarLinkProps,
} from "../actions/tab-bar.tsx";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import type { StyleProp } from "../types.ts";
import { RailFooter } from "./rail-footer.tsx";
import { Rail, RailRows, RailSidebar } from "./rail.tsx";
import {
  SidebarCollapseContext,
  SidebarToggle,
  useSidebarCollapse,
} from "./sidebar-toggle.tsx";
import { formStyles } from "./tab-view-form.stylex.ts";
import { tabViewStyles } from "./tab-view-layout.stylex.ts";
import {
  StatusLink,
  useOpeningScreen,
  useReveal,
  type TabLinkStatusProps,
} from "./use-opening-screen.tsx";
import { useRise } from "./use-rise.ts";
import { useSidebarFold } from "./use-sidebar-fold.ts";
import {
  TabViewSidebarNavContext,
  type TabViewSidebarNav,
} from "./use-tab-view-sidebar-nav.ts";

export { TabViewBrand } from "./tab-view-brand.tsx";
export type { TabLinkStatusProps } from "./use-opening-screen.tsx";

/** The props that `TabView` hands its `linkComponent`. */
export type TabViewLinkProps = TabBarLinkProps;

interface TabViewItem extends TabBarItem {
  /**
   * What the content area shows after a moment while this destination's
   * screen loads, in the shape of that screen.
   *
   * @zh 该目标页的画面加载片刻之后，内容区域显示的内容，形状与该画面一致。
   */
  skeleton: ReactElement;
}

/** A destination of a `TabView` with no router to wait for, which has no skeleton. */
interface PlainTabViewItem extends TabBarItem {
  skeleton?: undefined;
}

interface TabViewBaseProps {
  /**
   * Accessible name for the `<nav>` landmark of the rail and of the tab bar,
   * already localised.
   *
   * @zh 侧轨与标签栏中 `<nav>` 地标的无障碍名称，需已本地化。
   */
  label: string;
  /**
   * Renders each destination, in the rail and in the tab bar. Pass a framework
   * link to keep client-side navigation, and forward every prop it is handed
   * onto the rendered anchor.
   *
   * @default <a>
   * @zh 渲染侧轨与标签栏中的每个目标页。传入框架自带的链接组件即可保留客户端导航，请把收到的每一个 prop 都转发到渲染出的锚点上。
   */
  linkComponent?: ComponentType<TabViewLinkProps>;
  /**
   * The top of the sidebar and of the rail, such as a `TabViewBrand`. Each
   * child is a line: in the rail of icons it is centred, and in the sidebar
   * it starts at the inline start, with the button that collapses the
   * sidebar at the end of the first line. It shows from 34rem only; below
   * that, give its content another place.
   *
   * @zh 侧边栏与侧轨的顶部，例如 `TabViewBrand`。每个子元素占一行：在图标侧轨中居中，在侧边栏中从行首开始，收起侧边栏的按钮在第一行行尾。只在 34rem 及以上显示；更窄时请为其内容另找位置。
   */
  header?: ReactNode;
  /**
   * The bottom of the rail, such as the signed-in member. It shows from 34rem
   * only; below 34rem, give its content another place.
   *
   * @zh 侧轨底部，例如已登录的成员。只在 34rem 及以上显示；在 34rem 以下，请为其内容另找位置。
   */
  footer?: ReactNode;
  /**
   * Names the button that collapses the sidebar to the rail of icons and
   * expands it again, already localised. The button shows from 48rem, where
   * the sidebar does.
   *
   * @zh 把侧边栏收成图标侧轨、再展开的按钮的无障碍名称，需已本地化。按钮在 48rem 及以上、侧边栏显示的地方出现。
   */
  sidebarToggleLabel: string;
  /**
   * Whether the server paints the sidebar collapsed to the rail of icons. The
   * view keeps the visitor's choice in the `SIDEBAR_COLLAPSED_COOKIE` cookie
   * and follows it once the page hydrates. Where the server can read the
   * cookie, pass its value here, so that the first paint has the choice too.
   *
   * @default false
   * @zh 服务端是否把侧边栏画成收起的图标侧轨。视图把访客的选择记在 `SIDEBAR_COLLAPSED_COOKIE` cookie 里，并在页面水合后跟随它。服务端能读到这个 cookie 时，把它的值传到这里，首次绘制也就符合访客的选择。
   */
  defaultCollapsed?: boolean;
  /**
   * The screen of the current destination.
   *
   * @zh 当前目标页的画面。
   */
  children: ReactNode;
  /**
   * An effect the effect layer draws on the indicator of the current
   * destination. `"liquid"`, the default, pours it to the destination, and a
   * drag moves it with inertia. `"none"` keeps the plain indicator, which a
   * press and a drag move in the same way. The effect draws only inside an
   * `EffectLayerProvider` with WebGPU.
   *
   * @zh 由效果层在当前目标页的指示块上绘制的效果。默认的 `"liquid"` 让它涌向目标页，拖动时带着惯性移动。`"none"` 保留普通的指示块，按下与拖动以同样的方式移动它。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制。 @default "liquid"
   */
  effect?: "liquid" | "none";
  /**
   * Landmark element for the content. Use `"main"` (the default) for the
   * page's primary content, or `"div"` when the shell is nested inside a
   * surface that already owns the `<main>` landmark.
   *
   * @zh 内容区域的地标元素。使用 `main`（默认）承载页面主内容；当骨架嵌套在已拥有 `<main>` 地标的表面内时，使用 `div`。 @default "main"
   */
  as?: "main" | "div";
  /**
   * StyleX styles merged over the view's own, such as `pageColumn.list` to set
   * the width of the page column for each screen of one pane. A screen with a
   * sidebar sets its own.
   *
   * @zh 合并到视图自身样式之上的 StyleX 样式，例如用 `pageColumn.list` 为每个单栏画面设定页面栏的宽度。带侧栏的画面自行设定。
   */
  css?: StyleProp;
}

type TabViewProps = TabViewBaseProps &
  (
    | {
        /**
         * The destinations, in order, each with the `href`, `label`, `icon` and
         * `skeleton` of its screen. `current` marks the page the visitor is on,
         * `badge` is a small mark at the corner of the icon, and `status` is
         * hidden text that says what the mark means. `count`, such as the
         * number of open to-dos, shows at the end of a labelled row and as a
         * small counter on the icon elsewhere, in place of the `badge`. The
         * rail and the tab bar show the same ones.
         *
         * @zh 按顺序排列的目标页，每个都带有其画面的 `href`、`label`、`icon` 与 `skeleton`。`current` 标记访客所在的页面，`badge` 是图标角上的小标记，`status` 是说明该标记含义的隐藏文字。`count`（例如未完成待办的数量）显示在带标签的行尾，在其它形式中以图标上的小计数显示，并取代 `badge`。侧轨与标签栏显示同一组目标页。
         */
        items: readonly TabViewItem[];
        /**
         * A component that the view renders inside each destination link, so
         * that a router hook can read whether the navigation to it is pending.
         * With a plain `<a>`, leave it out or pass `null`: the current item
         * then follows `items`, no skeleton shows, and an item has none.
         *
         * @zh 视图渲染在每个目标页链接内部的组件，让路由器的 Hook 能读取该链接的导航是否处于 pending 状态。使用原生 `<a>` 时请省略它或传入 `null`：此时当前项跟随 `items`，不显示骨架屏，各项也不带骨架屏。
         */
        linkStatus: ComponentType<TabLinkStatusProps>;
        /**
         * What shows on a page outside every destination.
         *
         * @zh 不属于任何目标页的页面上显示的内容。
         */
        fallbackSkeleton?: ReactElement;
      }
    | {
        items: readonly PlainTabViewItem[];
        linkStatus?: null;
        fallbackSkeleton?: undefined;
      }
  );

interface TabViewLinksValue {
  linkComponent: ComponentType<TabViewLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  setOpening: Dispatch<SetStateAction<string | null>>;
}

const TabViewLinksContext = createContext<TabViewLinksValue>({
  linkComponent: PlainAnchor,
  linkStatus: null,
  setOpening: () => {},
});
/** What opens in the `TabView` around, `undefined` outside one. */
const TabViewOpeningContext = createContext<string | null | undefined>(
  undefined,
);
const TabViewSkeletonContext = createContext<ReactNode>(null);

/**
 * Whether a `TabView` is around the caller.
 *
 * @internal
 */
export function useIsInTabView() {
  return use(TabViewOpeningContext) !== undefined;
}

/**
 * The `href` of the destination that opens now, or null when none does.
 * Call it inside a `TabView`.
 */
export function useTabViewOpening() {
  return use(TabViewOpeningContext) ?? null;
}

/**
 * The skeleton of the destination that opens or shows now, and else the
 * `fallbackSkeleton`, for a loading fallback inside a `TabView`.
 */
export function TabViewSkeleton() {
  return use(TabViewSkeletonContext);
}

/**
 * A link to a destination of the `TabView` around, from anywhere in the view,
 * such as a mark in the rail or a row of a screen that opens another screen. It
 * renders the view's `linkComponent` and tells the view while the navigation to
 * it is pending, so the destination is current at once, and its skeleton shows
 * if its screen takes more than a moment. The `href` can hold a query. Outside a
 * `TabView`, it is a plain `<a>`.
 */
export function TabViewLink(props: TabViewLinkProps) {
  const { linkComponent, linkStatus, setOpening } = use(TabViewLinksContext);
  return (
    <StatusLink
      {...props}
      linkComponent={linkComponent}
      linkStatus={linkStatus}
      setOpening={setOpening}
    />
  );
}

/**
 * Content of the `header` or the `footer` of a `TabView` that shows only
 * where the rail shows labels, such as the app's name beside its mark.
 */
export function TabViewLabelsOnly({ children }: { children: ReactNode }) {
  return <span css={tabViewStyles.labelsOnly}>{children}</span>;
}

/**
 * Content of the `header` or the `footer` of a `TabView` that shows only
 * where the rail shows icons, such as an action with no label.
 */
export function TabViewIconsOnly({ children }: { children: ReactNode }) {
  return <span css={tabViewStyles.iconsOnly}>{children}</span>;
}

/**
 * The frame of an app with a few top-level destinations. Its form follows its
 * own width, so the server paints the right one. Below 34rem, a `TabBar`
 * floats over the bottom of the screen. From 34rem, a narrow rail on the
 * inline-start edge holds the destinations, each an icon over a small label,
 * the current one under an indicator that a press can drag along the rail.
 * From 48rem, the sidebar holds them, each a row of an icon and a label, with
 * the `header` at its top and the `footer` at its bottom.
 *
 * The view paints the sidebar fill behind the rail, and the content reaches the
 * other edges of the screen, with round corners beside the rail. The page
 * scrolls the content, and the rail stays on the screen. A screen with a list, the `sidebar` of a
 * `NavigationSplitView`, shows the list in the same sidebar, under the
 * destinations: from 48rem that view draws the destinations above its list,
 * and the view's own sidebar gives way. The destinations scroll with the list,
 * under the `header`. Below 48rem, the list is the first
 * page of that screen, beside the rail or over the tab bar.
 *
 * The button in the `header` collapses the sidebar to the rail of icons, and
 * a press is one motion. The content slides over the sidebar. Each icon and
 * label, the button, and each line of the `header` and the `footer` go to
 * their places in the other form. A press during the motion turns it around
 * from where it is. Under reduced motion, the form changes at once and the
 * rail fades in.
 *
 * The content goes under the bar: `tabViewTokens.barClearance` is the strip the
 * bar takes, and each layout in the content keeps clear of it. With
 * `linkStatus`, a tap on a destination makes it current at once. With Next,
 * pass it with the matching `Link` as `linkComponent`. When its screen takes
 * more than a moment to load, its skeleton rises into place while the old
 * screen stays mounted, hidden, and the screen fades in over it. A screen that
 * needs no wait rises into place by itself.
 *
 * The `"liquid"` effect draws the indicator as the SegmentedControl's does: plain
 * and solid at rest, with a lit edge only while a pointer is over it, and in motion
 * liquid that pours to the destination, flows on for a moment and sets again. A
 * release after a drag follows the link under it, and the indicator stays there
 * while that page loads. Under reduced motion it crossfades to its place. Outside
 * an `EffectLayerProvider` with WebGPU, and under forced colours, the view looks
 * and works as it does with `"none"`.
 */
export function TabView({
  items,
  label,
  linkComponent = PlainAnchor,
  linkStatus = null,
  fallbackSkeleton,
  header,
  footer,
  sidebarToggleLabel,
  defaultCollapsed = false,
  children,
  effect = "liquid",
  as = "main",
  css,
}: TabViewProps) {
  const { opening, setOpening, skeletonHref } = useOpeningScreen();
  const currentItem = items.find((item) => item.current === true);
  const shownHref = opening === null ? currentItem?.href : pathOfHref(opening);
  const shownItems = items.map((item) => ({
    ...item,
    current: item.href === shownHref,
  }));
  const screenSkeleton =
    items.find((item) => item.href === shownHref)?.skeleton ?? fallbackSkeleton;
  const waiting = skeletonHref !== null;
  const { revealing, onAnimationEnd } = useReveal(waiting);
  const [content, setContent] = useState<HTMLElement | null>(null);
  useRise(content, skeletonHref ?? currentItem?.href);
  const sticky = useEffectSticky();
  const { ref, css: stickyCss } = sticky;
  const Content = as;
  const { isCollapsed, scope } = useSidebarCollapse(true, defaultCollapsed);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [under, setUnder] = useState<HTMLElement | null>(null);
  const fold = useSidebarFold({ root, content, layer, under });
  const collapseScope =
    scope === null
      ? null
      : {
          ...scope,
          write(isNextCollapsed: boolean) {
            fold.pressed(isNextCollapsed ? "out" : "in");
            scope.write(isNextCollapsed);
          },
        };
  const toggle = (
    <span data-tab-view-part="toggle" css={tabViewStyles.toggle}>
      <SidebarToggle label={sidebarToggleLabel} />
    </span>
  );
  const top = (
    <div data-tab-view-slot="top" css={tabViewStyles.top}>
      {header}
      {toggle}
    </div>
  );
  const sidebarNav: TabViewSidebarNav = {
    isCollapsed,
    press: fold.press,
    pressShift: fold.pressShift,
    follow: fold.follow,
    top: <div css={[tabViewStyles.listNav, tabViewStyles.listTop]}>{top}</div>,
    list: (
      <div css={[tabViewStyles.listNav, tabViewStyles.listRows]}>
        <RailRows
          items={shownItems}
          label={label}
          linkComponent={TabViewLink}
        />
      </div>
    ),
    bottom:
      footer == null ? null : (
        <div
          data-tab-view-slot="footer"
          css={[
            tabViewStyles.listNav,
            tabViewStyles.slot,
            tabViewStyles.listFooter,
          ]}
        >
          {footer}
        </div>
      ),
  };
  return (
    <SidebarCollapseContext value={collapseScope}>
      <TabViewLinksContext value={{ linkComponent, linkStatus, setOpening }}>
        <TabViewOpeningContext value={opening}>
          <TabViewSkeletonContext value={screenSkeleton}>
            <div data-tab-view="" css={[tabViewStyles.container, css]}>
              <div
                ref={setRoot}
                css={[
                  tabViewStyles.root,
                  formStyles.form,
                  isCollapsed && formStyles.collapsed,
                ]}
              >
                <div
                  ref={ref}
                  data-tab-view-rail=""
                  css={[tabViewStyles.rail, stickyCss]}
                >
                  <EffectCarrier value={sticky}>
                    {top}
                    <Rail
                      items={shownItems}
                      label={label}
                      effect={effect}
                      linkComponent={TabViewLink}
                      css={tabViewStyles.iconsOnly}
                    />
                    <RailSidebar
                      items={shownItems}
                      label={label}
                      linkComponent={TabViewLink}
                      css={tabViewStyles.labelsOnly}
                    />
                    {footer == null ? null : (
                      <RailFooter css={tabViewStyles.slot}>{footer}</RailFooter>
                    )}
                  </EffectCarrier>
                </div>
                <div
                  ref={setUnder}
                  aria-hidden
                  inert
                  css={tabViewStyles.underContent}
                />
                <Content
                  ref={setContent}
                  {...stylex.props(
                    tabViewStyles.content,
                    revealing && tabViewStyles.reveal,
                  )}
                  onAnimationEnd={onAnimationEnd}
                >
                  {/* The router scrolls a new page to its top if that top is
                    out of view. So the hidden screen comes before the skeleton. */}
                  <div
                    css={
                      waiting
                        ? tabViewStyles.screenHidden
                        : tabViewStyles.screen
                    }
                  >
                    <TabViewSidebarNavContext value={sidebarNav}>
                      {children}
                    </TabViewSidebarNavContext>
                  </div>
                  {waiting ? screenSkeleton : null}
                </Content>
                <EffectCarrier value="viewport-bottom">
                  <TabBar
                    items={shownItems}
                    label={label}
                    effect={effect}
                    linkComponent={TabViewLink}
                    css={tabViewStyles.bar}
                  />
                </EffectCarrier>
                <div
                  ref={setLayer}
                  data-tab-view-flights=""
                  aria-hidden
                  inert
                  css={tabViewStyles.flights}
                />
              </div>
            </div>
          </TabViewSkeletonContext>
        </TabViewOpeningContext>
      </TabViewLinksContext>
    </SidebarCollapseContext>
  );
}

function pathOfHref(href: string) {
  return href.split(/[?#]/, 1)[0];
}
