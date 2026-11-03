"use client";

import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { tabBarTokens, tabLink } from "../actions/tab-bar.stylex.ts";
import {
  PlainAnchor,
  TabBar,
  type TabBarItem,
  type TabBarLinkProps,
} from "../actions/tab-bar.tsx";
import { useTabPress } from "../actions/use-tab-press.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import { useScrollMask } from "../hooks/use-scroll-mask.ts";
import { mergeRefs } from "../merge-refs.ts";
import { bind } from "../motion/bind.ts";
import type { Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
  motionKeyframes,
  transition,
} from "../primitives/motion.stylex.ts";
import { pageGutter } from "../primitives/page-column.stylex.ts";
import { stack } from "../primitives/stack.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import {
  color,
  controlSize,
  font,
  layer,
  rhythm,
  space,
} from "../tokens.stylex.ts";
import { headerControlsTokens } from "./header-controls.stylex.ts";
import { tabViewQueries, tabViewTokens } from "./tab-view.stylex.ts";

export interface TabViewItem extends TabBarItem {
  /**
   * What the content area shows after a moment while this destination's
   * screen loads, in the shape of that screen. `null` is allowed where a
   * screen has none.
   *
   * @zh 该目标页的画面加载片刻之后，内容区域显示的内容，形状与该画面一致。画面没有骨架屏时可以传入 `null`。
   */
  skeleton: ReactNode;
}

export interface TabLinkStatusProps {
  /** Call it with whether the router's navigation to this link is pending. */
  children: (pending: boolean) => ReactNode;
}

interface TabViewProps {
  /**
   * The destinations, in order: the shape `TabBar` takes, each with the
   * `skeleton` of its screen. The rail and the tab bar show the same ones.
   *
   * @zh 按顺序排列的目标页：形状与 `TabBar` 的相同，每个还带有其画面的 `skeleton`。侧轨与标签栏显示同一组目标页。
   */
  items: readonly TabViewItem[];
  /**
   * Accessible name for the `<nav>` landmark of the rail and of the tab bar.
   * The package ships no i18n, so the consumer supplies the localised string.
   *
   * @zh 侧轨与标签栏中 `<nav>` 地标的无障碍名称。本包不内置 i18n，请由调用方提供本地化字符串。
   */
  label: string;
  /**
   * Link Slot — renders each destination, in the rail and in the tab bar.
   * Defaults to a plain `<a>`; pass a framework link to keep client-side
   * navigation. Forward every prop it is handed onto the rendered anchor.
   *
   * @zh 链接插槽——渲染侧轨与标签栏中的每个目标页。默认为原生 `<a>`；传入框架自带的链接组件即可保留客户端导航。请把收到的每一个 prop 都转发到渲染出的锚点上。
   */
  linkComponent?: ComponentType<TabBarLinkProps>;
  /**
   * A component that the view renders inside each destination link, so that
   * a router hook can read the state of that link. It calls `children` with
   * whether the navigation to that link is pending. With Next, pass it with
   * the matching `Link` as `linkComponent`. With it, the tapped destination
   * is current at once. If the screen takes more than a moment to load, its
   * `skeleton` shows in the content area while the old screen stays mounted,
   * hidden, and the new screen then fades in. With a plain `<a>`, pass
   * `null`: the current item then follows `items`, and no skeleton shows.
   *
   * @zh 视图渲染在每个目标页链接内部的组件，让路由器的 hook 能读取该链接的状态。它用该链接的导航是否处于 pending 状态调用 `children`。使用 Next 时，把它和对应的 `Link`（作为 `linkComponent`）一起传入。有了它，按下的目标页立即成为当前项；如果画面需要加载片刻，内容区域会显示它的 `skeleton`，旧画面保持挂载但隐藏，新画面随后淡入。使用原生 `<a>` 时请传入 `null`：此时当前项跟随 `items`，也不显示骨架屏。
   */
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  /**
   * What shows where no destination gives a skeleton: on a page outside
   * every destination, and for a destination whose `skeleton` is `null`.
   *
   * @zh 没有目标页提供骨架屏时显示的内容：不属于任何目标页的页面上，以及 `skeleton` 为 `null` 的目标页。
   */
  fallbackSkeleton?: ReactNode;
  /**
   * The top of the rail, such as the app's mark. It is as wide as the
   * destinations, and centres what it holds. It shows at `md` and wider
   * only; below `md`, give its content another place.
   *
   * @zh 侧轨顶部，例如应用标志。它与目标页同宽，并让其内容居中。只在 `md` 及以上显示；在 `md` 以下，请为其内容另找位置。
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
   * The screen of the current destination.
   *
   * @zh 当前目标页的画面。
   */
  children: ReactNode;
  /**
   * An effect the effect layer draws on the indicator of the current
   * destination, in the rail and in the tab bar. `"liquid"`, the default,
   * draws it as `TabBar`'s `effect` describes, and in the rail the liquid
   * pours up and down from one destination to the next. A press on a
   * destination in the rail pours it there at once, and a drag from that
   * press moves it with inertia along the rail. `"none"` keeps the plain
   * indicator, which a press and a drag move in the same way. The effect
   * draws only inside an `EffectLayerProvider` with WebGPU; elsewhere, and
   * under forced colours, the view looks and works as it does with
   * `"none"`.
   *
   * @zh 由效果层在当前目标页的指示块上绘制的效果，侧轨与标签栏都适用。默认的 `"liquid"` 按 `TabBar` 的 `effect` 所述绘制它；在侧轨中，液体从一个目标页向上或向下涌向下一个目标页。在侧轨中按下某个目标页时液体立即涌向那里，从这次按下开始拖动时它带着惯性沿侧轨移动。`"none"` 保留普通的指示块，按下与拖动以同样的方式移动它。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，视图的外观与行为与 `"none"` 相同。 @default "liquid"
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
}

interface TabViewLinksValue {
  linkComponent: ComponentType<TabBarLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
  setOpening: Dispatch<SetStateAction<string | null>>;
}

const TabViewLinksContext = createContext<TabViewLinksValue>({
  linkComponent: PlainAnchor,
  linkStatus: null,
  setOpening: () => {},
});
const TabViewOpeningContext = createContext<string | null>(null);
const TabViewSkeletonContext = createContext<ReactNode>(null);

/**
 * How long a switch waits for the new screen before the skeleton shows. A
 * screen that the router holds renders in less time, so it shows no skeleton.
 */
const SKELETON_DELAY_MS = 100;

/**
 * The `href` of the destination that opens now, or null when none does.
 * Call it inside a `TabView`.
 */
export function useTabViewOpening() {
  return use(TabViewOpeningContext);
}

/**
 * The skeleton of the destination that opens or shows now, and else the
 * `fallbackSkeleton`, for a loading fallback inside a `TabView`.
 */
export function TabViewSkeleton() {
  return use(TabViewSkeletonContext);
}

function isCurrentUrl(href: string) {
  const { pathname, search } = new URL(href, location.href);
  return pathname === location.pathname && search === location.search;
}

function OpeningReporter({
  href,
  pending,
}: {
  href: string;
  pending: boolean;
}) {
  const { setOpening } = use(TabViewLinksContext);
  useLayoutEffect(() => {
    if (pending && !isCurrentUrl(href)) {
      setOpening(href);
    } else {
      setOpening((opening) => (opening === href ? null : opening));
    }
  }, [pending, href, setOpening]);
  return null;
}

interface SlottedLinkProps extends TabBarLinkProps {
  linkComponent: ComponentType<TabBarLinkProps>;
  linkStatus: ComponentType<TabLinkStatusProps> | null;
}

// This function is separate from `TabViewLink` because the lint rule
// `static-components` does not let a function render a component that it reads
// from a context.
function SlottedLink({
  linkComponent: LinkComponent,
  linkStatus: LinkStatus,
  children,
  ...props
}: SlottedLinkProps) {
  return (
    <LinkComponent {...props}>
      {children}
      {LinkStatus === null ? null : (
        <LinkStatus>
          {(pending) => <OpeningReporter href={props.href} pending={pending} />}
        </LinkStatus>
      )}
    </LinkComponent>
  );
}

function TabViewLink(props: TabBarLinkProps) {
  const { linkComponent, linkStatus } = use(TabViewLinksContext);
  return (
    <SlottedLink
      {...props}
      linkComponent={linkComponent}
      linkStatus={linkStatus}
    />
  );
}

/**
 * The destination that opens, and the one whose skeleton shows, which is the
 * one that opens once it has taken `SKELETON_DELAY_MS`.
 */
function useOpeningScreen() {
  const [opening, setOpening] = useState<string | null>(null);
  const [slow, setSlow] = useState<string | null>(null);
  if (opening === null && slow !== null) setSlow(null);
  useEffect(() => {
    if (opening === null) return;
    const timer = setTimeout(() => {
      setSlow(opening);
    }, SKELETON_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [opening]);
  return {
    opening,
    setOpening,
    skeletonHref: slow === opening ? opening : null,
  };
}

/** Whether the screen fades in now, which it does each time its skeleton goes. */
function useReveal(hidden: boolean) {
  const [wasHidden, setWasHidden] = useState(hidden);
  const [revealing, setRevealing] = useState(false);
  if (hidden !== wasHidden) {
    setWasHidden(hidden);
    setRevealing(!hidden);
  }
  return {
    revealing,
    onAnimationEnd: (event: AnimationEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) setRevealing(false);
    },
  };
}

/**
 * The frame of an app with a few top-level destinations. Where the view is
 * `md` wide or wider, a narrow rail on the inline-start edge holds them, each
 * an icon over a small label, the current one raised on the canvas under an
 * indicator that a press can drag along the rail, as on a `TabBar`, with the
 * `header` at its top and the `footer` at its bottom. The rail has no fill
 * of its own, so the content beside it, such as the islands of a
 * `NavigationSplitView`, floats on the same canvas. Below that, a `TabBar`
 * floats over the bottom of the screen instead. A container query on the
 * view chooses, so the server paints the right one. The content goes under
 * the bar: `tabViewTokens.barClearance` is the strip the bar takes, and each
 * layout in the content keeps clear of it. With `linkStatus`, a tap on a
 * destination makes it current at once. When its screen takes more than a
 * moment to load, its skeleton rises into place, and the screen fades in over
 * it. A screen that needs no wait rises into place by itself.
 */
export function TabView({
  items,
  label,
  linkComponent = PlainAnchor,
  linkStatus,
  fallbackSkeleton,
  header,
  footer,
  children,
  effect = "liquid",
  as = "main",
}: TabViewProps) {
  const { opening, setOpening, skeletonHref } = useOpeningScreen();
  const currentItem = items.find((item) => item.current === true);
  const shownHref = opening ?? currentItem?.href;
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
  const { ref, css } = sticky;
  const Content = as;
  return (
    <TabViewLinksContext value={{ linkComponent, linkStatus, setOpening }}>
      <TabViewOpeningContext value={opening}>
        <TabViewSkeletonContext value={screenSkeleton}>
          <div css={styles.container}>
            <div css={styles.root}>
              <div ref={ref} css={[styles.rail, css]}>
                <EffectCarrier value={sticky}>
                  {header == null ? null : (
                    <div css={styles.slot}>{header}</div>
                  )}
                  <Rail
                    items={shownItems}
                    label={label}
                    effect={effect}
                    linkComponent={TabViewLink}
                  />
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
                {waiting ? screenSkeleton : null}
                <div css={waiting ? styles.screenHidden : styles.screen}>
                  {children}
                </div>
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

interface RailProps {
  items: readonly TabBarItem[];
  label: string;
  effect: "liquid" | "none";
  linkComponent: ComponentType<TabBarLinkProps>;
}

/**
 * The destinations in the rail, in a Scroll region for a rail too short to
 * hold them all.
 */
function Rail({ label, ...track }: RailProps) {
  const region = useScrollRegion();
  const { scroller, content } = region;
  const navRef = useRef<HTMLElement>(null);
  const { showStartMask, showEndMask } = useScrollMask(navRef, "vertical");
  return (
    <nav ref={mergeRefs(scroller, navRef)} aria-label={label} css={styles.nav}>
      <div ref={content} css={styles.navContent}>
        <EffectCarrier value={region}>
          <RailTrack {...track} scrolls={showStartMask || showEndMask} />
        </EffectCarrier>
      </div>
    </nav>
  );
}

interface RailTrackProps extends Omit<RailProps, "label"> {
  scrolls: boolean;
}

/**
 * The current destination under an indicator that moves down and up the
 * rail as the one on a `TabBar` moves across it.
 */
function RailTrack({
  items,
  effect,
  linkComponent: LinkComponent,
  scrolls,
}: RailTrackProps) {
  const current = items.findIndex((item) => item.current === true);
  const track = useTabPress({
    current,
    effect,
    surface: "flat",
    orientation: "vertical",
    scrolls,
    hoverSurface: true,
  });
  return (
    <div {...track.props} css={[track.css, styles.track]}>
      <span {...track.hover} css={[corner.radius_3, track.hoverCss]} />
      {track.shown >= 0 ? (
        <span
          {...track.indicator}
          css={[corner.radius_3, track.indicatorCss]}
        />
      ) : null}
      {/* `role="list"` survives the marker reset, which otherwise drops
            list semantics in Safari/VoiceOver. */}
      <ul role="list" css={stack.rows}>
        {items.map((item, index) => {
          const isShown = index === track.shown;
          return (
            <li key={item.href}>
              <LinkComponent
                href={item.href}
                aria-current={item.current === true ? "page" : undefined}
                {...track.segment(index)}
                {...stylex.props(
                  typeRole.caption,
                  a11y.touchRow,
                  transition.colors,
                  corner.radius_3,
                  styles.link,
                  track.segmentCss(index),
                  isShown && tabLink.shown,
                  a11y.focusRingInset,
                )}
              >
                <span css={styles.icon} aria-hidden>
                  <item.icon weight={isShown ? "fill" : "bold"} />
                  {item.badge ? (
                    <span css={styles.badge}>{item.badge}</span>
                  ) : null}
                </span>
                <span css={styles.label}>{item.label}</span>
                {item.status === undefined ? null : (
                  <>
                    {" "}
                    <span css={a11y.srOnly} role="status">
                      {item.status}
                    </span>
                  </>
                )}
              </LinkComponent>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const RISE_SPRING = springOf(springRoles.surface);

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

/** The new screen at `t` of its rise: it fades in as it rises `space._7` into place. */
function risePose(t: number): Styles {
  return {
    opacity: t.toFixed(3),
    transform: `translateY(calc(${(1 - t).toFixed(4)} * ${space._7}))`,
  };
}

/**
 * Makes the screen in `content` rise into place each time `screen` changes
 * after the first render. Under reduced motion it stays still.
 */
function useRise(content: HTMLElement | null, screen: unknown) {
  const engine = useMotionEngine();
  const rise = useMotionValue(engine, 1, { spring: RISE_SPRING });
  useLayoutEffect(() => {
    if (content === null) return;
    const binding = bind(content, rise, { pose: risePose, rest: "clear" });
    return () => {
      binding.unbind();
    };
  }, [content, rise]);
  const shownRef = useRef(screen);
  useLayoutEffect(() => {
    if (shownRef.current === screen) return;
    shownRef.current = screen;
    if (engine.reducedMotion) return;
    rise.set(0);
    rise.to(1);
  }, [engine, rise, screen]);
}

const styles = stylex.create({
  container: {
    containerName: "tab-view",
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
      [tabViewQueries.bar]: "env(safe-area-inset-top)",
      [tabViewQueries.rail]: "0px",
    },
    [tabViewTokens.barClearance]: {
      default: null,
      [tabViewQueries.bar]: `calc(${tabBarTokens.blockSize} + ${tabViewTokens.barInsetBlockEnd})`,
      [tabViewQueries.rail]: "0px",
    },
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [tabViewQueries.rail]: "auto minmax(0, 1fr)",
    },
    gridTemplateRows: "minmax(0, 1fr)",
    blockSize: "100%",
  },
  // The rail is as tall as the screen, and as tall as its container where
  // that is shorter.
  rail: {
    display: { default: "none", [tabViewQueries.rail]: "flex" },
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.item,
    position: "sticky",
    insetBlockStart: 0,
    zIndex: layer.header,
    boxSizing: "border-box",
    inlineSize: `calc(${tabViewTokens.railInlineSize} + env(safe-area-inset-left))`,
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
    paddingInlineStart: `calc(${space._0} + env(safe-area-inset-left))`,
    paddingInlineEnd: space._0,
  },
  slot: {
    display: "flex",
    justifyContent: "center",
    alignSelf: "stretch",
    minInlineSize: 0,
  },
  footer: {
    marginBlockStart: "auto",
  },
  nav: {
    alignSelf: "stretch",
    minBlockSize: 0,
    overflowY: "auto",
  },
  navContent: {
    position: "relative",
  },
  // The spring moves the indicator past the first and the last link. The
  // nav clips it there, but it also makes the nav scroll for a moment, so
  // the track clips it first.
  track: {
    overflow: "clip",
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
    // The liquid rests in a shape as wide as the link, with round ends, so
    // it fits only in a link at least as tall as it is wide.
    aspectRatio: 1,
    paddingBlock: space._1,
    paddingInline: 0,
    color: {
      default: color.fgControl,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    fontWeight: font.weight_5,
    textDecoration: "none",
    // A press on a destination can drag the indicator, so it does not
    // select the label.
    userSelect: "none",
  },
  icon: {
    position: "relative",
    display: "inline-flex",
    fontSize: controlSize._5,
  },
  badge: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: `calc(-1 * ${space._0})`,
    display: "flex",
  },
  // A label too long for the rail wraps, and it breaks inside a word only
  // where the word alone is wider than the rail.
  label: {
    maxInlineSize: "100%",
    minInlineSize: 0,
    letterSpacing: font.trackingTight,
    textAlign: "center",
    textWrap: "balance",
    overflowWrap: "anywhere",
  },
  content: {
    minInlineSize: 0,
  },
  screen: {
    display: "contents",
  },
  screenHidden: {
    display: "none",
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
    display: { default: "block", [tabViewQueries.rail]: "none" },
    position: "fixed",
    insetInlineStart: pageGutter.inlineStart,
    insetInlineEnd: pageGutter.inlineEnd,
    insetBlockEnd: tabViewTokens.barInsetBlockEnd,
    zIndex: layer.header,
  },
});
