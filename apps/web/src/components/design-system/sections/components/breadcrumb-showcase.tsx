"use client";

import * as stylex from "@stylexjs/stylex";
import {
  Breadcrumb,
  type BreadcrumbLinkProps,
} from "@tuja/ui/components/breadcrumb";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

/** The link Slot's contract: forward `className` and `style` onto the anchor. */
function RouterLink({ href, children, className, style }: BreadcrumbLinkProps) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

export function BreadcrumbShowcase() {
  const locale = useLocale();

  const home = t({ en: "Home", zh: "首页" });
  const designSystem = t({ en: "Design system", zh: "设计系统" });
  const components = t({ en: "Components", zh: "组件" });
  const actions = t({ en: "Actions", zh: "操作控件" });
  const breadcrumb = t({ en: "Breadcrumb", zh: "面包屑导航" });

  const homeHref = getLocalePath("/", locale);
  const designSystemHref = getLocalePath("/design-system", locale);
  const breadcrumbHref = getLocalePath(
    "/design-system/components/breadcrumb",
    locale,
  );

  const trail = [
    { label: home, href: homeHref },
    { label: designSystem, href: designSystemHref },
    { label: breadcrumb },
  ];

  return (
    <>
      <Showcase label={t({ en: "Trail", zh: "路径" })}>
        <Specimen caption="items">
          <Breadcrumb
            items={trail}
            label={t({ en: "Trail example", zh: "路径示例" })}
          />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Items run root first and the last one is the page you are on. label names the <nav> landmark and is required — the package ships no copy of its own, so the localised name comes from the consumer.",
            zh: "各项从根开始排列，最后一项就是当前所在页面。label 为 <nav> 地标命名，且为必填——该包不自带任何文案，本地化名称由使用方提供。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Crumbs", zh: "层级项" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption={t({ en: "current page", zh: "当前页面" })}>
            <Breadcrumb
              items={[
                { label: home, href: homeHref },
                { label: designSystem, href: designSystemHref },
                { label: breadcrumb, href: breadcrumbHref },
              ]}
              label={t({ en: "Current page example", zh: "当前页面示例" })}
            />
          </Specimen>
          <Specimen caption={t({ en: "grouping level", zh: "分组层级" })}>
            <Breadcrumb
              items={[
                { label: home, href: homeHref },
                { label: designSystem, href: designSystemHref },
                { label: components },
                { label: breadcrumb },
              ]}
              label={t({ en: "Grouping level example", zh: "分组层级示例" })}
            />
          </Specimen>
        </div>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'The trailing crumb is always the current page: it renders as text carrying aria-current="page", and an href on it is ignored — the first trail here has one. An earlier crumb without an href reads as plain muted text, which is what a grouping level with no page of its own should look like.',
            zh: '最后一项始终是当前页面：它渲染为带 aria-current="page" 的文本，其上的 href 会被忽略——上面第一条路径就带着 href。靠前的层级项若没有 href，则显示为弱化的纯文本，这正适合表示没有独立页面的分组层级。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Separator", zh: "分隔符" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="default">
            <Breadcrumb
              items={trail}
              label={t({
                en: "Default separator example",
                zh: "默认分隔符示例",
              })}
            />
          </Specimen>
          <Specimen caption='separator="/"'>
            <Breadcrumb
              items={trail}
              separator="/"
              label={t({ en: "Slash separator example", zh: "斜杠分隔符示例" })}
            />
          </Specimen>
          <Specimen caption='separator="·"'>
            <Breadcrumb
              items={trail}
              separator="·"
              label={t({ en: "Dot separator example", zh: "圆点分隔符示例" })}
            />
          </Specimen>
        </div>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Separators are decorative: each renders aria-hidden, so the trail is announced as its crumbs and never as the punctuation between them. Any node works — a character, a slash, an icon.",
            zh: "分隔符是装饰性的：每个都以 aria-hidden 渲染，因此朗读时只会读出层级项，不会读出其间的标点。可传入任意节点——字符、斜杠或图标。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Long trails", zh: "长路径" })}>
        <Specimen caption={t({ en: "wraps", zh: "换行" })}>
          <div css={[corner.radius_2, styles.container]}>
            <Breadcrumb
              items={[
                { label: home, href: homeHref },
                { label: designSystem, href: designSystemHref },
                { label: components },
                { label: actions },
                { label: breadcrumb },
              ]}
              label={t({ en: "Long trail example", zh: "长路径示例" })}
            />
          </div>
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "There is no overflow menu and no ellipsis crumb. A trail too wide for its container wraps onto another line, so every ancestor stays reachable at 400% zoom. When a trail only reads well collapsed, shorten the hierarchy rather than the component.",
            zh: "组件没有折叠菜单，也没有省略号层级项。当路径宽度超出容器时会换行排列，因此在 400% 缩放下每个上级层级依然可达。若某条路径只有折叠后才好读，应当精简层级本身，而不是精简组件。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Link Slot", zh: "链接插槽" })}>
        <Specimen caption="linkComponent">
          <Breadcrumb
            items={trail}
            linkComponent={RouterLink}
            label={t({ en: "Link Slot example", zh: "链接插槽示例" })}
          />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Every navigable crumb goes through linkComponent. The default is a plain <a>, which reloads the page; pass the framework's link — next/link here — to keep navigation client-side. The Slot receives the crumb's className and style and has to forward both onto its anchor, or the crumb loses its colour and its focus ring.",
            zh: "每个可导航的层级项都经由 linkComponent 渲染。默认是原生 <a>，会触发整页刷新；传入框架自带的链接组件——这里是 next/link——即可保留客户端导航。该插槽会收到层级项的 className 与 style，必须把两者都转发到锚点上，否则层级项会失去配色与聚焦轮廓。",
          })}
        </Text>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "items",
              type: "ReadonlyArray<BreadcrumbItem>",
              required: true,
              description: t({
                en: "The trail, root first. An empty array renders nothing — a named landmark around an empty list is worse than no landmark.",
                zh: "路径本身，从根开始。传入空数组时不渲染任何内容——包着空列表的具名地标比没有地标更糟。",
              }),
            },
            {
              name: "label",
              type: "string",
              required: true,
              description: t({
                en: "Accessible name for the <nav> landmark. Required because the package ships no i18n, so the consumer supplies the localised string.",
                zh: "为 <nav> 地标提供的可访问名称。因该包不内置 i18n 而设为必填，本地化字符串由使用方提供。",
              }),
            },
            {
              name: "separator",
              type: "ReactNode",
              description: t({
                en: "Node drawn between crumbs, rendered aria-hidden. Defaults to a chevron.",
                zh: "绘制在层级项之间的节点，以 aria-hidden 渲染。默认为一个尖角箭头。",
              }),
            },
            {
              name: "linkComponent",
              type: "ComponentType<BreadcrumbLinkProps>",
              description: t({
                en: "Slot rendering every navigable crumb; it must forward className and style onto its anchor. Defaults to a plain <a>.",
                zh: "渲染每个可导航层级项的插槽；它必须把 className 与 style 转发到锚点上。默认为原生 <a>。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides merged over the nav's own — the config-layer escape hatch.",
                zh: "合并到 nav 自身样式之上的 StyleX 覆盖样式——配置层的逃生舱。",
              }),
            },
            {
              name: "className",
              type: "string",
              description: t({
                en: "Escape-hatch class applied to the nav.",
                zh: "应用于 nav 的逃生舱类名。",
              }),
            },
            {
              name: "style",
              type: "CSSProperties",
              description: t({
                en: "Inline style applied to the nav.",
                zh: "应用于 nav 的内联样式。",
              }),
            },
          ]}
        />
        <ShowcaseHelper>
          {t({
            en: "BreadcrumbItem is { label: string; href?: string } — the visible text, plus the destination that a level with no page of its own leaves out.",
            zh: "BreadcrumbItem 的形状是 { label: string; href?: string }——可见文本，加上目标地址；没有独立页面的层级可省略后者。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Breadcrumb
              items={trail}
              label={t({
                en: "Recommended trail example",
                zh: "推荐路径示例",
              })}
            />
          }
          doCaption={t({
            en: "List the page's real ancestors, root first. The last crumb is the current page, so it is announced with aria-current and never linked back to where the visitor already stands.",
            zh: "按层级列出当前页面真实的上级路径，从根开始。最后一项是当前页面，因此带有 aria-current，也绝不会链接到访客已经身处的位置。",
          })}
          dont={
            <Breadcrumb
              items={[
                { label: home, href: homeHref },
                {
                  label: t({ en: "Chip", zh: "标签按钮" }),
                  href: getLocalePath("/design-system/components/chip", locale),
                },
                {
                  label: t({ en: "Switch", zh: "开关" }),
                  href: getLocalePath(
                    "/design-system/components/switch",
                    locale,
                  ),
                },
                { label: breadcrumb },
              ]}
              label={t({
                en: "Discouraged trail example",
                zh: "不推荐路径示例",
              })}
            />
          }
          dontCaption={t({
            en: "Don't retrace how the visitor got here — Chip and Switch are siblings of this page, not ancestors. A breadcrumb reports location, and it is not a Back control: the browser already has one.",
            zh: "不要还原访客的浏览过程——标签按钮与开关是本页面的同级页面，而非上级。面包屑导航表示位置，也不是返回控件：浏览器本身已经提供了返回。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
  note: {
    maxInlineSize: "65ch",
  },
  // A narrow container, drawn so the constraint the trail wraps against is
  // visible rather than implied.
  container: {
    maxInlineSize: space._13,
    paddingBlock: space._2,
    paddingInline: space._3,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
});
