"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { tabBarTokens } from "../actions/tab-bar.stylex.ts";
import {
  PlainAnchor,
  TabBar,
  type TabBarItem,
  type TabBarLinkProps,
} from "../actions/tab-bar.tsx";
import { useTabPress } from "../actions/use-tab-press.ts";
import { pointer } from "../breakpoints.stylex.ts";
import { EffectCarrier } from "../effect-layer/effect-carrier.tsx";
import { LIQUID_INDICATOR } from "../effect-layer/liquid-indicator.ts";
import { useEffectSticky } from "../effect-layer/use-effect-sticky.ts";
import { useScrollRegion } from "../effect-layer/use-scroll-region.ts";
import {
  segmentIndicator,
  segmentTrackMarker,
} from "../forms/segment-indicator.stylex.ts";
import { useScrollMask } from "../hooks/use-scroll-mask.ts";
import { mergeRefs } from "../merge-refs.ts";
import { bind } from "../motion/bind.ts";
import { movingMarker } from "../motion/moving-marker.stylex.ts";
import type { Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
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
import { tabViewQueries, tabViewTokens } from "./tab-view.stylex.ts";

interface TabViewProps {
  /**
   * The destinations, in order, in the shape `TabBar` takes. The rail and
   * the tab bar show the same ones.
   *
   * @zh 按顺序排列的目标页，形状与 `TabBar` 的相同。侧轨与标签栏显示同一组目标页。
   */
  items: readonly TabBarItem[];
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
   * The top of the rail, such as the app's mark. It shows at `md` and wider
   * only; below `md`, give its content another place.
   *
   * @zh 侧轨顶部，例如应用标志。只在 `md` 及以上显示；在 `md` 以下，请为其内容另找位置。
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
   * Names the screen that shows now. When it changes, the new screen rises
   * into place. Defaults to the `href` of the current item. Pass it when
   * the current item changes before the new screen shows, such as when a
   * link marks its destination current while the screen loads.
   *
   * @zh 当前显示的画面的标识。它改变时，新画面上升到位。默认为当前项的 `href`。如果当前项在新画面显示之前就改变（例如链接在画面加载时就把其目标页标为当前），请传入此值。
   */
  screenKey?: string | number;
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
 * layout in the content keeps clear of it. A switch to another screen makes
 * the new screen rise into place.
 */
export function TabView({
  items,
  label,
  linkComponent: LinkComponent = PlainAnchor,
  header,
  footer,
  children,
  screenKey,
  effect = "liquid",
  as = "main",
}: TabViewProps) {
  const screen = screenKey ?? items.find((item) => item.current === true)?.href;
  const [content, setContent] = useState<HTMLElement | null>(null);
  useRise(content, screen);
  const sticky = useEffectSticky();
  const { ref, css } = sticky;
  return (
    <div css={styles.container}>
      <div css={styles.root}>
        <div ref={ref} css={[styles.rail, css]}>
          <EffectCarrier value={sticky}>
            {header == null ? null : <div css={styles.slot}>{header}</div>}
            <Rail
              items={items}
              label={label}
              effect={effect}
              linkComponent={LinkComponent}
            />
            {footer == null ? null : (
              <div css={[styles.slot, styles.footer]}>{footer}</div>
            )}
          </EffectCarrier>
        </div>
        {as === "main" ? (
          <main ref={setContent} css={styles.content}>
            {children}
          </main>
        ) : (
          <div ref={setContent} css={styles.content}>
            {children}
          </div>
        )}
        <EffectCarrier value="viewport-bottom">
          <TabBar
            items={items}
            label={label}
            effect={effect}
            linkComponent={LinkComponent}
            css={styles.bar}
          />
        </EffectCarrier>
      </div>
    </div>
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
  const { trackRef, shown, held, inset, dragging, trackProps, linkProps } =
    useTabPress({ current, effect, orientation: "vertical" });
  return (
    <div
      ref={trackRef}
      css={[
        segmentTrackMarker,
        segmentIndicator.track,
        // A drag down a rail that scrolls scrolls it, so that touch reaches
        // each destination.
        !scrolls && segmentIndicator.trackVertical,
      ]}
      {...trackProps}
    >
      {shown >= 0 ? (
        <span
          aria-hidden="true"
          {...{ [LIQUID_INDICATOR]: "" }}
          css={[
            corner.radius_3,
            segmentIndicator.base,
            styles.indicator,
            inset !== null && segmentIndicator.atBlock(inset.start, inset.end),
            dragging && segmentIndicator.dragged,
          ]}
        />
      ) : null}
      {/* `role="list"` survives the marker reset, which otherwise drops
            list semantics in Safari/VoiceOver. */}
      <ul role="list" css={stack.rows}>
        {items.map((item, index) => {
          const isShown = index === shown;
          return (
            <li key={item.href}>
              <LinkComponent
                href={item.href}
                aria-current={item.current === true ? "page" : undefined}
                {...linkProps(index)}
                {...stylex.props(
                  typeRole.caption,
                  a11y.touchRow,
                  transition.colors,
                  corner.radius_3,
                  styles.link,
                  held && segmentIndicator.held,
                  isShown && [segmentIndicator.anchor, styles.linkShown],
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

/** The motion engine sets this attribute on a box while it moves it. */
const MOVED = ":is([data-moving])";
const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";
/** The effect layer sets this attribute on the track while it draws the indicator. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

const styles = stylex.create({
  container: {
    containerName: "tab-view",
    containerType: "inline-size",
    blockSize: "100%",
  },
  root: {
    // No bar floats over the top of the page, so sticky chrome parks under
    // the status bar.
    "--header-controls-clearance": {
      default: "env(safe-area-inset-top)",
      [tabViewQueries.rail]: "0px",
    },
    [tabViewTokens.barClearance]: {
      default: `calc(${tabBarTokens.blockSize} + ${tabViewTokens.barInsetBlockEnd})`,
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
    paddingBlockStart: `calc(${space._3} + env(safe-area-inset-top))`,
    paddingBlockEnd: `calc(${space._3} + env(safe-area-inset-bottom))`,
    paddingInlineStart: `calc(${space._0} + env(safe-area-inset-left))`,
    paddingInlineEnd: space._0,
  },
  slot: {
    display: "flex",
    justifyContent: "center",
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
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
    fontWeight: font.weight_5,
    textDecoration: "none",
    // A press on a destination can drag the indicator, so it does not
    // select the label.
    userSelect: "none",
  },
  indicator: {
    backgroundColor: color.bgControlRaised,
  },
  // The indicator paints the surface of the shown destination, so the link
  // gives up its own fill. Where there is no anchor positioning the link
  // paints that surface itself, unless the effect draws the indicator over
  // the rail. The colour and the filled icon stay in all of them, because
  // they are the signal in forced colours.
  linkShown: {
    color: color.fgControlSelected,
    fontWeight: font.weight_6,
    backgroundColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: color.bgControlRaised,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]:
          "transparent",
      },
      [stylex.when.ancestor(MOVED, movingMarker)]: color.bgControlRaised,
    },
    // The surface changes from the indicator to the link at once.
    transition: {
      default: null,
      [stylex.when.ancestor(MOVED, movingMarker)]: "none",
    },
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
