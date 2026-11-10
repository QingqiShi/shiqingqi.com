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
import { tabBarTokens } from "../actions/tab-bar.stylex.ts";
import {
  PlainAnchor,
  TabBar,
  type TabBarItem,
  type TabBarLinkProps,
} from "../actions/tab-bar.tsx";
import { pointer } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
} from "../primitives/motion.stylex.ts";
import { pageGutter } from "../primitives/page-column.stylex.ts";
import { viewWidth } from "../primitives/view-width.stylex.ts";
import { layer, rhythm, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { headerControlsTokens } from "./header-controls.stylex.ts";
import { Rail, RailSidebar } from "./rail.tsx";
import { tabViewForm, tabViewTokens } from "./tab-view.stylex.ts";
import {
  StatusLink,
  useOpeningScreen,
  useReveal,
  type TabLinkStatusProps,
} from "./use-opening-screen.tsx";
import { useRise } from "./use-rise.ts";

export { TabViewBrand } from "./tab-view-brand.tsx";
export type { TabLinkStatusProps } from "./use-opening-screen.tsx";

/** The props that `TabView` hands its `linkComponent`. */
export type TabViewLinkProps = TabBarLinkProps;

export interface TabViewItem extends TabBarItem {
  /**
   * What the content area shows after a moment while this destination's
   * screen loads, in the shape of that screen.
   *
   * @zh 该目标页的画面加载片刻之后，内容区域显示的内容，形状与该画面一致。
   */
  skeleton: ReactElement;
}

/** A destination of a `TabView` with no router to wait for, which has no skeleton. */
export interface PlainTabViewItem extends TabBarItem {
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
   * How the rail shows the destinations at `md` and wider. `"auto"`, the
   * default, shows the sidebar where the view is as wide as `breakpoints.lg`
   * and the icon rail where it is narrower. `"labels"` is a sidebar of rows,
   * each an icon and a label, with the count of a destination at the row
   * end, and `secondary` under them. `"icons"` is a narrow rail of icons,
   * each over a small label. Below `md`, the tab bar shows in each case.
   * A screen with a `NavigationSplitView` sidebar already has a sidebar, so
   * with `"auto"` the rail stays icons on such a screen. Give an app whose
   * screens do not all have one `"icons"`, so that its frame does not change
   * from screen to screen, or move the list of the sidebar to `secondary`.
   *
   * @zh 在 `md` 及以上，侧轨如何显示各目标页。默认的 `"auto"` 在视图宽度达到 `breakpoints.lg` 时显示侧边栏，更窄时显示图标侧轨。`"labels"` 是由行组成的侧边栏，每行是一个图标和一个标签，目标页的计数显示在行尾，`secondary` 显示在它们下方。`"icons"` 是一条窄的图标侧轨，每个图标下方有一个小标签。在 `md` 以下，任何情况下都显示标签栏。带有 `NavigationSplitView` 侧栏的画面已经有一个侧栏，因此使用 `"auto"` 时，侧轨在这样的画面上保持图标形式。如果应用并非每个画面都有这样的侧栏，请使用 `"icons"`，让框架不随画面变化，或把侧栏中的列表移到 `secondary`。 @default "auto"
   */
  rail?: "icons" | "labels" | "auto";
  /**
   * The top of the rail, such as the app's mark. In the icon rail it is as
   * wide as the destinations, and centres what it holds; in the labelled
   * sidebar it starts at the inline start, such as a mark and the app's
   * name. It shows at `md` and wider only; below `md`, give its content
   * another place.
   *
   * @zh 侧轨顶部，例如应用标志。在图标侧轨中，它与目标页同宽，并让其内容居中；在带标签的侧边栏中，它从行首开始排列，例如标志加上应用名称。只在 `md` 及以上显示；在 `md` 以下，请为其内容另找位置。
   */
  header?: ReactNode;
  /**
   * The bottom of the rail, such as the signed-in member. It shows at `md`
   * and wider only; below `md`, give its content another place.
   *
   * @zh 侧轨底部，例如已登录的成员。只在 `md` 及以上显示；在 `md` 以下，请为其内容另找位置。
   */
  footer?: ReactNode;
  /**
   * A second list under the destinations, such as the reports of this
   * month. It shows only in the labelled sidebar, so where the icon rail or
   * the tab bar shows, the screen must give another way to it, such as a
   * link on the screen.
   *
   * @zh 位于各目标页下方的第二个列表，例如本月的报告。它只在带标签的侧边栏中显示，因此在显示图标侧轨或标签栏时，画面必须提供另一条通往它的途径，例如画面上的一个链接。
   */
  secondary?: ReactNode;
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
  return <span css={styles.labelsOnly}>{children}</span>;
}

/**
 * The frame of an app with a few top-level destinations. Where the view is
 * `md` wide or wider, a narrow rail on the inline-start edge holds them, each
 * an icon over a small label, the current one raised on the canvas under an
 * indicator that a press can drag along the rail, with the
 * `header` at its top and the `footer` at its bottom. With `rail`, a wider
 * sidebar can hold them instead, each a row of an icon and a label, with a
 * `secondary` list under them. The rail has no fill
 * of its own, so the content beside it, such as the islands of a
 * `NavigationSplitView`, floats on the same canvas. Below that, a `TabBar`
 * floats over the bottom of the screen instead. A container query on the
 * view chooses, so the server paints the right one. The content goes under
 * the bar: `tabViewTokens.barClearance` is the strip the bar takes, and each
 * layout in the content keeps clear of it. With `linkStatus`, a tap on a
 * destination makes it current at once. With Next, pass it with the matching
 * `Link` as `linkComponent`. When its screen takes more than a moment to load,
 * its skeleton rises into place while the old screen stays mounted, hidden, and
 * the screen fades in over it. A screen that needs no wait rises into place by
 * itself.
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
  rail = "auto",
  header,
  footer,
  secondary,
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
  return (
    <TabViewLinksContext value={{ linkComponent, linkStatus, setOpening }}>
      <TabViewOpeningContext value={opening}>
        <TabViewSkeletonContext value={screenSkeleton}>
          <div css={[styles.container, css]}>
            <div css={[styles.root, formStyles[rail]]}>
              <div ref={ref} css={[styles.rail, stickyCss]}>
                <EffectCarrier value={sticky}>
                  {header == null ? null : (
                    <div css={styles.slot}>{header}</div>
                  )}
                  {rail === "labels" ? null : (
                    <Rail
                      items={shownItems}
                      label={label}
                      effect={effect}
                      linkComponent={TabViewLink}
                      css={styles.iconsOnly}
                    />
                  )}
                  {rail === "icons" ? null : (
                    <RailSidebar
                      items={shownItems}
                      label={label}
                      linkComponent={TabViewLink}
                      secondary={secondary}
                      css={styles.labelsOnly}
                    />
                  )}
                  {footer == null ? null : (
                    <div css={[styles.slot, styles.footer]}>{footer}</div>
                  )}
                </EffectCarrier>
              </div>
              <Content
                ref={setContent}
                {...stylex.props(styles.content, revealing && styles.reveal)}
                onAnimationEnd={onAnimationEnd}
              >
                {/* The router scrolls a new page to its top if that top is
                    out of view. So the hidden screen comes before the skeleton. */}
                <div css={waiting ? styles.screenHidden : styles.screen}>
                  {children}
                </div>
                {waiting ? screenSkeleton : null}
              </Content>
              <EffectCarrier value="viewport-bottom">
                <TabBar
                  items={shownItems}
                  label={label}
                  effect={effect}
                  linkComponent={TabViewLink}
                  css={styles.bar}
                />
              </EffectCarrier>
            </div>
          </div>
        </TabViewSkeletonContext>
      </TabViewOpeningContext>
    </TabViewLinksContext>
  );
}

function pathOfHref(href: string) {
  return href.split(/[?#]/, 1)[0];
}

const RAIL_PADDING_BLOCK_START = `calc(${space._3} + env(safe-area-inset-top))`;
const RAIL_PADDING_BLOCK_END = `calc(${space._3} + env(safe-area-inset-bottom))`;
// CSS cannot read the radius of a rounded display corner. These values
// assume a radius of 55px, as on an iPhone Pro. With them, a 40px mark at
// the top of the rail and a 32px avatar at the bottom are about 11px from
// the curve, which is almost their distance from the side of the screen. A
// touch screen can have rounded corners and give no safe area at a corner,
// such as the inner screen of a foldable phone.
const DISPLAY_CORNER_CLEARANCE_BLOCK_START = "2.5rem";
const DISPLAY_CORNER_CLEARANCE_BLOCK_END = space._5;

const SIDEBAR_PADDING_INLINE = space._2;
const HAS_SPLIT_VIEW_SIDEBAR = ":has([data-split-view-column=sidebar])";

// Each form sets every value, so a view in the content of another does not
// take the form of the outer one. StyleX puts a plain value of a custom
// property outside its cascade layers, where it wins over a value in a
// container query. So `auto` gives each width its own query.
const formStyles = stylex.create({
  icons: {
    [tabViewForm.icons]: "block",
    [tabViewForm.labels]: "none",
    [tabViewForm.inlineSize]: tabViewTokens.railInlineSize,
    [tabViewForm.paddingInline]: space._0,
    [tabViewForm.slotJustify]: "center",
  },
  labels: {
    [tabViewForm.icons]: "none",
    [tabViewForm.labels]: "block",
    [tabViewForm.inlineSize]: tabViewTokens.sidebarInlineSize,
    [tabViewForm.paddingInline]: SIDEBAR_PADDING_INLINE,
    [tabViewForm.slotJustify]: "flex-start",
  },
  auto: {
    [tabViewForm.icons]: {
      default: null,
      [viewWidth.belowLg]: "block",
      [viewWidth.fromLg]: {
        default: "none",
        [HAS_SPLIT_VIEW_SIDEBAR]: "block",
      },
    },
    [tabViewForm.labels]: {
      default: null,
      [viewWidth.belowLg]: "none",
      [viewWidth.fromLg]: {
        default: "block",
        [HAS_SPLIT_VIEW_SIDEBAR]: "none",
      },
    },
    [tabViewForm.inlineSize]: {
      default: null,
      [viewWidth.belowLg]: tabViewTokens.railInlineSize,
      [viewWidth.fromLg]: {
        default: tabViewTokens.sidebarInlineSize,
        [HAS_SPLIT_VIEW_SIDEBAR]: tabViewTokens.railInlineSize,
      },
    },
    [tabViewForm.paddingInline]: {
      default: null,
      [viewWidth.belowLg]: space._0,
      [viewWidth.fromLg]: {
        default: SIDEBAR_PADDING_INLINE,
        [HAS_SPLIT_VIEW_SIDEBAR]: space._0,
      },
    },
    [tabViewForm.slotJustify]: {
      default: null,
      [viewWidth.belowLg]: "center",
      [viewWidth.fromLg]: {
        default: "flex-start",
        [HAS_SPLIT_VIEW_SIDEBAR]: "center",
      },
    },
  },
});

const styles = stylex.create({
  container: {
    containerName: "tab-view split-view-screen",
    containerType: "inline-size",
    blockSize: "100%",
  },
  // StyleX writes a plain custom property outside its cascade layers, but a
  // custom property in a container query inside them. Thus a plain default
  // wins over the container query, and each form must set its own value.
  root: {
    // No bar floats over the top of the page, so sticky chrome parks under
    // the status bar.
    [headerControlsTokens.clearance]: {
      default: null,
      [viewWidth.belowMd]: "env(safe-area-inset-top)",
      [viewWidth.fromMd]: "0px",
    },
    [tabViewTokens.barClearance]: {
      default: null,
      [viewWidth.belowMd]: `calc(${tabBarTokens.blockSize} + ${tabViewTokens.barInsetBlockEnd})`,
      [viewWidth.fromMd]: "0px",
    },
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [viewWidth.fromMd]: "auto minmax(0, 1fr)",
    },
    gridTemplateRows: "minmax(0, 1fr)",
    blockSize: "100%",
  },
  // The rail is as tall as the screen, and as tall as its container where
  // that is shorter.
  rail: {
    display: { default: "none", [viewWidth.fromMd]: "flex" },
    flexDirection: "column",
    gap: rhythm.item,
    position: "sticky",
    insetBlockStart: 0,
    zIndex: layer.header,
    boxSizing: "border-box",
    inlineSize: `calc(${tabViewForm.inlineSize} + env(safe-area-inset-left))`,
    blockSize: "100dvh",
    maxBlockSize: "100%",
    paddingBlockStart: {
      default: RAIL_PADDING_BLOCK_START,
      [pointer.coarse]: `max(${RAIL_PADDING_BLOCK_START}, ${DISPLAY_CORNER_CLEARANCE_BLOCK_START})`,
    },
    paddingBlockEnd: {
      default: RAIL_PADDING_BLOCK_END,
      [pointer.coarse]: `max(${RAIL_PADDING_BLOCK_END}, ${DISPLAY_CORNER_CLEARANCE_BLOCK_END})`,
    },
    paddingInlineStart: `calc(${tabViewForm.paddingInline} + env(safe-area-inset-left))`,
    paddingInlineEnd: tabViewForm.paddingInline,
  },
  slot: {
    display: "flex",
    flexShrink: 0,
    justifyContent: tabViewForm.slotJustify,
    minInlineSize: 0,
  },
  iconsOnly: {
    display: tabViewForm.icons,
  },
  labelsOnly: {
    display: tabViewForm.labels,
  },
  footer: {
    marginBlockStart: "auto",
  },
  // The screen rises with a transform. WebKit anchors the scroll of the page
  // through it, and the scroll that a view restores then follows the rise.
  content: {
    minInlineSize: 0,
    overflowAnchor: "none",
  },
  screen: {
    display: "contents",
  },
  // A screen can mount while it is hidden, and it must lay out, as a component
  // can measure itself once as it mounts.
  screenHidden: {
    display: "block",
    visibility: "hidden",
    blockSize: 0,
    overflow: "clip",
  },
  reveal: {
    animationName: {
      default: motionKeyframes.fadeIn,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._300,
    animationTimingFunction: easing.easeOut,
  },
  // The pill is nearly as wide as the screen, but it is at the bottom, so it
  // never covers the top-centre point that iOS Safari samples for the status
  // bar colour.
  bar: {
    display: { default: "block", [viewWidth.fromMd]: "none" },
    position: "fixed",
    insetInlineStart: pageGutter.inlineStart,
    insetInlineEnd: pageGutter.inlineEnd,
    insetBlockEnd: tabViewTokens.barInsetBlockEnd,
    zIndex: layer.header,
  },
});
