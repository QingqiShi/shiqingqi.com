"use client";

import type { Icon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import {
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";
import { pointer } from "../breakpoints.stylex.ts";
import {
  LIQUID_INDICATOR,
  LIQUID_SEGMENT,
} from "../effect-layer/liquid-indicator.ts";
import {
  segmentIndicator,
  segmentTrackMarker,
} from "../forms/segment-indicator.stylex.ts";
import { useSegmentPress } from "../forms/use-segment-press.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { truncate } from "../primitives/layout.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { glassSurface, glassTokens } from "../surfaces/glass-surface.stylex.ts";
import {
  color,
  controlSize,
  font,
  rhythm,
  shadow,
  space,
} from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { tabBarTokens } from "./tab-bar.stylex.ts";

/**
 * The contract of the link Slot. Everything the bar hands the Slot has to
 * reach the rendered anchor: `href` and `children`, `className` and `style`
 * (which carry the whole look), and the attributes in the rest — the
 * `aria-current` that names the current destination among them.
 */
export interface TabBarLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
export function PlainAnchor(props: TabBarLinkProps) {
  return <a {...props} />;
}

/** One destination in the bar. */
export interface TabBarItem {
  /** Where the tab goes. Unique within the bar. */
  href: string;
  /** The tab's visible name. A label too long for its tab truncates. */
  label: ReactNode;
  /**
   * A Phosphor icon, drawn `fill` on the current tab and `bold` on the
   * others. Decorative: `label` names the tab.
   */
  icon: Icon;
  /** Marks the tab as the page the visitor is on, with `aria-current="page"`. */
  current?: boolean;
  /**
   * A small mark at the icon's top-end corner, such as a dot that says
   * something waits. Decorative: say what it means in `status`.
   */
  badge?: ReactNode;
  /**
   * Visually hidden text in a `role="status"` region inside the link, so it
   * is announced when it changes and is part of the tab's name — what the
   * `badge` means. Pass `null` while there is nothing to say, so that the
   * region is in place before the text arrives.
   */
  status?: ReactNode;
}

interface TabBarProps {
  /**
   * The destinations, in order. Each tab takes the same width, whatever the
   * length of its label. One with `current` set is the page the visitor is
   * on; with none set, no tab is marked.
   *
   * @zh 按顺序排列的目标页。每个标签页宽度相同，与标签文字的长短无关。设置了 `current` 的那一项就是访客所在的页面；都没有设置时，不标记任何标签页。
   */
  items: readonly TabBarItem[];
  /**
   * Accessible name for the `<nav>` landmark. Required — the package ships no
   * i18n, so the consumer supplies the localised string.
   *
   * @zh 为 `<nav>` 地标提供的可访问名称。因该包不内置 i18n 而设为必填，本地化字符串由使用方提供。
   */
  label: string;
  /**
   * An effect the effect layer draws on the indicator. `"liquid"`, the
   * default, draws it as the SegmentedControl's does: solid at rest with a
   * lit edge, and in motion liquid that pours to the tab, flows on for a
   * moment and sets again. A press on a tab pours it there at once, and a
   * drag from that press moves it with inertia across the tabs. A release
   * after a drag follows the link of the tab under it; a tap follows the
   * tab's own link, as a click does. The indicator stays on the tab it went
   * to while that page loads. Under reduced motion it crossfades to its
   * place. `"none"` keeps the plain Glass indicator, which a press and a
   * drag move in the same way. The effect draws only inside an
   * `EffectLayerProvider` with WebGPU; elsewhere, and under forced colours,
   * the bar looks and works as it does with `"none"`.
   *
   * @zh 由效果层在指示块上绘制的效果。默认的 `"liquid"` 与分段控件的效果相同：静止时是边缘带光的实心指示块；运动时是液体，涌向该标签页，继续流动片刻后重新凝固。按下某个标签页时液体立即涌向该标签页，从这次按下开始拖动时它带着惯性在各标签页之间移动。拖动后松开，会打开其下方标签页的链接；轻触则与点击一样打开该标签页自身的链接。在页面加载期间，指示块停留在它去往的标签页上。减少动态效果时，它以交叉淡入淡出到位。`"none"` 保留普通的玻璃指示块，按下与拖动以同样的方式移动它。效果只在带有 WebGPU 的 `EffectLayerProvider` 之内绘制；在其它情况下以及强制颜色模式下，标签栏的外观与行为与 `"none"` 相同。
   */
  effect?: "liquid" | "none";
  /**
   * Link Slot — renders each tab. Defaults to a plain `<a>`; pass a framework
   * link (`next/link` and friends) to keep client-side navigation without
   * this package depending on a framework.
   *
   * Forward every prop it is handed onto the rendered anchor, or the tab
   * loses its look, its current state, or its place in the drag.
   *
   * @zh 链接插槽——负责渲染每个标签页。默认为原生 `<a>`；传入框架自带的链接组件（例如 `next/link`）即可保留客户端导航，且该包本身不依赖任何框架。
   *
   * 请把收到的每一个 prop 都转发到渲染出的锚点上，否则标签页会失去外观、当前状态，或无法参与拖动。
   */
  linkComponent?: ComponentType<TabBarLinkProps>;
  /**
   * StyleX styles merged over the bar's own — where the consumer places it,
   * such as fixed to the bottom of the screen.
   *
   * @zh 合并到标签栏自身样式之上的 StyleX 样式——由使用方决定它的位置，例如固定在屏幕底部。
   */
  css?: StyleProp;
}

/** Whether a click opens the link in place, with no key and no other button. */
function isPlainClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The top-level destinations of an app in a pill of Glass, each tab an icon
 * over a label and all of them the same width. A Glass indicator marks the
 * current tab, and a press can drag it to another, as on a SegmentedControl.
 * The tabs are links: Tab and Enter reach and follow them, and the current
 * one carries `aria-current="page"`. The bar does not place itself; pass
 * `css` to float it over the bottom of the screen.
 */
export function TabBar({
  items,
  label,
  effect = "liquid",
  linkComponent: LinkComponent = PlainAnchor,
  css,
}: TabBarProps) {
  const current = items.findIndex((item) => item.current === true);
  // The tab a click went to, held under the indicator until the page it
  // opens is the current one.
  const [followed, setFollowed] = useState<{
    index: number;
    from: number;
  } | null>(null);
  if (followed !== null && followed.from !== current) {
    setFollowed(null);
  }
  // The tab that a tap released on. The indicator stays on it until the
  // click that the release causes. In iOS Safari, this click can come many
  // frames after the release.
  const [tapped, setTapped] = useState<number | null>(null);
  const resting = tapped ?? followed?.index ?? current;
  const droppedRef = useRef(false);
  const { trackRef, shown, held, inset, dragging, handlers } =
    useSegmentPress<HTMLDivElement>({
      selected: resting,
      effect,
      onDrop(drop) {
        if (drop.dragged) {
          droppedRef.current = true;
          drop.element.click();
        } else {
          setTapped(drop.index);
        }
      },
    });

  return (
    <nav aria-label={label} css={[corner.radius_round, styles.bar, css]}>
      <div
        ref={trackRef}
        css={[
          glassSurface.base,
          corner.radius_round,
          segmentTrackMarker,
          segmentIndicator.track,
          styles.track,
        ]}
        {...handlers}
        onPointerDown={(event) => {
          droppedRef.current = false;
          setTapped(null);
          handlers.onPointerDown(event);
        }}
        onClickCapture={(event) => {
          setTapped(null);
          // A drag follows the link under the indicator on release, so the
          // click that the pointer makes after it goes nowhere. A click
          // with no pointer has a detail of 0 and goes on to the link.
          if (droppedRef.current && event.detail > 0) {
            droppedRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {shown >= 0 ? (
          <span
            aria-hidden="true"
            {...{ [LIQUID_INDICATOR]: "" }}
            css={[
              corner.radius_round,
              segmentIndicator.base,
              segmentIndicator.tint,
              inset !== null && segmentIndicator.at(inset.left, inset.right),
              dragging && segmentIndicator.dragged,
            ]}
          />
        ) : null}
        {/* `role="list"` survives the marker reset, which otherwise drops
            list semantics in Safari/VoiceOver. */}
        <ul role="list" css={styles.list}>
          {items.map((item, index) => {
            const isShown = index === shown;
            return (
              <li key={item.href} css={styles.item}>
                <LinkComponent
                  href={item.href}
                  aria-current={item.current === true ? "page" : undefined}
                  draggable={false}
                  onClick={(event) => {
                    if (isPlainClick(event)) {
                      setFollowed({ index, from: current });
                    }
                  }}
                  {...{ [LIQUID_SEGMENT]: "" }}
                  {...stylex.props(
                    typeRole.caption,
                    a11y.touchTarget,
                    transition.colors,
                    corner.radius_round,
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
                  <span css={[truncate.base, styles.label]}>{item.label}</span>
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
    </nav>
  );
}

const NO_ANCHOR_POSITIONING = "@supports not (anchor-name: --x)";
/** The effect layer sets this attribute on the track while it draws the indicator. */
const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

const styles = stylex.create({
  // The Glass casts only a small shadow. A bar that floats over the content
  // needs a deeper one, so the frame casts it.
  bar: {
    display: "block",
    boxShadow: shadow._4,
  },
  // Text and large amounts scroll behind the labels. A deeper blur and a
  // fill tinted with the surface colour keep the content from competing
  // with them.
  track: {
    [glassTokens.blur]: "24px",
    [glassTokens.fill]: `color-mix(in srgb, ${color.bgSurface} 30%, ${color.bgMaterialGlass})`,
    display: "flex",
    blockSize: tabBarTokens.blockSize,
    padding: space._0,
  },
  list: {
    display: "flex",
    flexGrow: 1,
    minInlineSize: 0,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  // A non-wrapping label's min-content width blocks an even flex split,
  // even with `flexBasis: 0`. `minInlineSize: 0` fixes it, so a label
  // truncates before it makes its tab wider than the others.
  item: {
    display: "flex",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minInlineSize: 0,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.inline,
    flexGrow: 1,
    minInlineSize: 0,
    paddingInline: space._0,
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
    // A press on a tab can drag the indicator, so it does not select the
    // label.
    userSelect: "none",
  },
  // The indicator paints the surface of the shown tab, so the tab gives up
  // its own fill. Where there is no anchor positioning the tab paints that
  // surface itself, unless the effect draws the indicator over the bar. The
  // colour and the filled icon stay in all of them, because they are the
  // signal in forced colours.
  linkShown: {
    color: color.fgControlSelected,
    fontWeight: font.weight_6,
    backgroundColor: {
      default: "transparent",
      [NO_ANCHOR_POSITIONING]: {
        default: color.bgMaterialGlassSelected,
        [stylex.when.ancestor(DRAWN_BY_EFFECT, segmentTrackMarker)]:
          "transparent",
      },
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
  // Pairs with `truncate.base`: the ellipsis engages only once the label
  // can shrink below its min-content width.
  label: {
    maxInlineSize: "100%",
    minInlineSize: 0,
    letterSpacing: font.trackingTight,
  },
});
