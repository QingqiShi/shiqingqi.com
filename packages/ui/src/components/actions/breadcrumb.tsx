import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { flex } from "../../primitives/flex.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { color, font, space } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";
import { BreadcrumbAnchor } from "./breadcrumb-anchor.tsx";

/** One crumb in the trail. */
export interface BreadcrumbItem {
  /** Visible crumb text. */
  label: string;
  /**
   * Destination; omit for a crumb that is not navigable. The trailing crumb
   * is the current page, so any `href` on it is ignored.
   */
  href?: string;
}

/**
 * The contract of the link Slot. `className` and `style` carry the crumb's
 * styles, so a supplied component must forward both onto its anchor.
 */
export interface BreadcrumbLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface BreadcrumbProps {
  /**
   * The trail, root first. The last item is the current page.
   *
   * An empty array renders nothing — a named landmark around an empty list is
   * worse than no landmark.
   *
   * @zh 路径本身，从根开始排列，最后一项即为当前页面。
   *
   * 传入空数组时不会渲染任何内容——带着空列表的具名地标比没有地标更糟。
   */
  items: ReadonlyArray<BreadcrumbItem>;
  /**
   * Accessible name for the `<nav>` landmark. Required — the package ships no
   * i18n, so the consumer supplies the localised string (config layer).
   *
   * @zh 为 `<nav>` 地标提供的可访问名称。因该包不内置 i18n 而设为必填，本地化字符串由使用方提供。
   */
  label: string;
  /**
   * Separator between crumbs, rendered `aria-hidden`. Defaults to a chevron.
   *
   * @zh 绘制在层级项之间的分隔符，以 `aria-hidden` 渲染。默认为一个尖角箭头。
   */
  separator?: ReactNode;
  /**
   * Link Slot — renders every navigable crumb. Defaults to a plain `<a>`; pass
   * a framework link (`next/link` and friends) to keep client-side navigation
   * without this package depending on a framework.
   *
   * Forward `className` and `style` onto the rendered anchor, or a crumb
   * loses its colour and its focus ring.
   *
   * @zh 链接插槽——渲染每个可导航的层级项。默认为原生 `<a>`；传入框架自带的链接组件（例如 `next/link`）即可保留客户端导航，且该包本身不依赖任何框架。
   *
   * 请把 `className` 与 `style` 转发到渲染出的锚点上，否则层级项会失去配色与聚焦轮廓。
   */
  linkComponent?: ComponentType<BreadcrumbLinkProps>;
  /**
   * StyleX styles merged over the nav's own — the config-layer escape hatch.
   *
   * @zh 合并到 nav 自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/** The trail of ancestor pages above the current one. */
export function Breadcrumb({
  items,
  label,
  separator,
  linkComponent: LinkComponent = BreadcrumbAnchor,
  css,
}: BreadcrumbProps) {
  // A named landmark holding an empty list is worse than no landmark.
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav aria-label={label} css={[styles.nav, css]}>
      {/* `role="list"` survives the marker reset, which otherwise drops list
          semantics in Safari/VoiceOver. */}
      <ol role="list" css={[flex.wrap, styles.list]}>
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          return (
            <li key={item.href ?? item.label} css={[flex.row, styles.item]}>
              {isCurrent || item.href === undefined ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  css={isCurrent ? styles.current : styles.inert}
                >
                  {item.label}
                </span>
              ) : (
                <LinkComponent
                  href={item.href}
                  {...stylex.props(
                    corner.radius_1,
                    styles.link,
                    transition.colors,
                    a11y.focusRing,
                  )}
                >
                  {item.label}
                </LinkComponent>
              )}
              {isCurrent ? null : (
                <span css={styles.separator} aria-hidden>
                  {separator ?? <CaretRightIcon weight="bold" />}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const styles = stylex.create({
  nav: {
    minInlineSize: 0,
  },
  // Wraps rather than scrolls, so a long trail still reflows at 400% zoom.
  list: {
    gap: space._1,
    listStyle: "none",
    margin: 0,
    padding: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_2,
  },
  item: {
    gap: space._1,
    minInlineSize: 0,
  },
  link: {
    color: { default: color.textMuted, ":hover": color.textMain },
    textDecorationLine: { default: "none", ":hover": "underline" },
    fontWeight: font.weight_5,
  },
  current: {
    color: color.textMain,
    fontWeight: font.weight_6,
  },
  inert: {
    color: color.textMuted,
  },
  separator: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    color: color.textSubtle,
  },
});
