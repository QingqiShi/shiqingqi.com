import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ComponentType } from "react";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { border } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { anchorTokens } from "./anchor.stylex.ts";
import { ExternalLinkIndicator } from "./external-link-indicator.tsx";

/**
 * The contract of the link Slot. Everything the component hands the Slot has to
 * reach the rendered anchor: `href` and `children`, `className` and `style`
 * (which carry the whole look), `ref`, and the anchor attributes and event
 * handlers that arrive in the rest.
 */
export interface AnchorLinkProps extends ComponentProps<"a"> {
  href: string;
}

/** @internal */
function PlainAnchor(props: AnchorLinkProps) {
  return <a {...props} />;
}

interface AnchorProps extends Omit<ComponentProps<"a">, "className" | "style"> {
  /**
   * Destination.
   *
   * @zh 目标地址。
   */
  href: string;
  /**
   * Screen-reader text after a link with `target="_blank"`, such as
   * "(opens in new tab)". Required — the package ships no i18n, so the
   * consumer supplies the localized string, usually once in a wrapper that
   * also sets `linkComponent`.
   *
   * @zh `target="_blank"` 链接之后供读屏使用的文字，例如“(在新标签页中打开)”。必填——该包不内置 i18n，由使用方提供本地化文案，通常与 `linkComponent` 一起在一个封装组件里统一传入。
   */
  newTabLabel: string;
  /**
   * Show the external-link icon and `newTabLabel` when `target="_blank"`.
   * Defaults to true. Opt out for wrappers that already render their own
   * external-link affordance, such as a card.
   *
   * @zh 当 `target="_blank"` 时显示外部链接图标与 `newTabLabel`，默认为 true。若外层组件已自带外部链接提示（例如卡片），可关闭。
   */
  indicateExternal?: boolean;
  /**
   * `"default"` stands out from the text around it: full colour and
   * semibold. `"muted"` keeps the muted colour and the weight of the text
   * around it, and only the underline marks it, for a link in a line of
   * secondary details, such as a count or a source. A `standalone` muted link
   * that starts with an icon is marked by the icon, so it shows the underline
   * only on hover.
   *
   * @zh `"default"` 在周围文字中显得突出：全色、半粗体。`"muted"` 保持周围文字的弱化颜色与字重，仅以下划线标示，适合次要信息行中的链接，例如计数或来源。以图标开头的 `standalone` 弱化链接由图标标示，因此只在悬停时显示下划线。
   */
  tone?: "default" | "muted";
  /**
   * The link stands on its own, outside a sentence. Under a coarse pointer it
   * then takes a hit area of at least 44px, as a button does, without a change
   * to how it looks. Leave it off for a link in running text, where that area
   * would cover the lines above and below.
   *
   * @zh 链接独立存在，不在句子之中。在粗略指针下，它会获得至少 44px 的点击区域，与按钮一致，外观不变。若链接位于连续文字中，请保持关闭，否则该区域会遮住上下行。
   */
  standalone?: boolean;
  /**
   * Link Slot — renders the anchor. Defaults to a plain `<a>`; pass a framework
   * link (`next/link` and friends) to keep client-side navigation without this
   * package depending on a framework.
   *
   * Forward every prop it is handed onto the rendered anchor, or the link loses
   * its look.
   *
   * @zh 链接插槽——负责渲染锚点。默认为原生 `<a>`；传入框架自带的链接组件（例如 `next/link`）即可保留客户端导航，且该包本身不依赖任何框架。
   *
   * 请把收到的每一个 prop 都转发到渲染出的锚点上，否则链接会失去外观。
   */
  linkComponent?: ComponentType<AnchorLinkProps>;
  /**
   * StyleX styles merged over the link's own — the config-layer escape hatch.
   *
   * @zh 合并在链接自身样式之上的 StyleX 样式——配置层的逃生舱口。
   */
  css?: StyleProp;
}

/**
 * An inline text link. A link with `target="_blank"` gets
 * `rel="noopener noreferrer"` and, unless `indicateExternal` is false, an icon
 * and screen-reader text that say it opens in a new tab.
 */
export function Anchor({
  css,
  rel,
  target,
  children,
  newTabLabel,
  indicateExternal = true,
  tone = "default",
  standalone = false,
  linkComponent: LinkComponent = PlainAnchor,
  ...props
}: AnchorProps) {
  const isNewTab = target === "_blank";
  return (
    <LinkComponent
      {...props}
      target={target}
      rel={isNewTab ? mergeRel(rel, "noopener noreferrer") : rel}
      // The Slot is a component, so the styles travel as a compiled
      // `className`/`style` pair rather than through the `css` prop.
      {...stylex.props(
        standalone && a11y.touchTarget,
        styles[tone],
        tone === "muted" && standalone && styles.mutedIconLed,
        a11y.focusRing,
        css,
      )}
    >
      {children}
      {indicateExternal && isNewTab && (
        <ExternalLinkIndicator label={newTabLabel} />
      )}
    </LinkComponent>
  );
}

/** Adds the required rel tokens to the existing ones, without duplicates. */
function mergeRel(existing: string | undefined, required: string): string {
  if (!existing) return required;
  const tokens = new Set(existing.split(/\s+/));
  for (const token of required.split(/\s+/)) {
    tokens.add(token);
  }
  return [...tokens].join(" ");
}

const styles = stylex.create({
  // When many rows each have an icon-led link, such as "Open mail", the
  // underlines at rest make a column of lines. The icon shows that the text is
  // a link. Thus the underline shows only on hover.
  mutedIconLed: {
    textDecorationLine: {
      default: null,
      ":has(> svg:first-child)": "none",
      ":hover": { default: null, [pointer.canHover]: "underline" },
    },
  },
  default: {
    color: anchorTokens.color,
    fontWeight: anchorTokens.fontWeight,
    textDecorationThickness: {
      default: null,
      ":hover": { default: null, [pointer.canHover]: border.size_2 },
    },
  },
  muted: {
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    fontWeight: "inherit",
    textDecorationThickness: {
      default: null,
      ":hover": { default: null, [pointer.canHover]: border.size_2 },
    },
  },
});
