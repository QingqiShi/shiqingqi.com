"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { AnchorButtonGroup } from "@tuja/ui/components/anchor-button-group";
import { Button } from "@tuja/ui/components/button";
import { AnchorButton } from "#src/components/shared/anchor-button.tsx";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function ButtonShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Button>{t({ en: "Default", zh: "默认" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary">
            <Button variant="primary">
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="active">
            <Button isActive>{t({ en: "Active", zh: "激活" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="bright">
            <Button bright>{t({ en: "Bright", zh: "明亮" })}</Button>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="sm">
            <Button size="sm">{t({ en: "Small", zh: "小" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="md">
            <Button size="md">{t({ en: "Medium", zh: "中" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="lg">
            <Button size="lg">{t({ en: "Large", zh: "大" })}</Button>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="leading icon">
            <Button icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary + icon">
            <Button variant="primary" icon={<ArrowRightIcon weight="bold" />}>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="icon only">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={t({ en: "Delete", zh: "删除" })}
            />
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Button disabled>{t({ en: "Default", zh: "默认" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary">
            <Button variant="primary" disabled>
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Button group", zh: "按钮组" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="segmented">
            <AnchorButtonGroup>
              <AnchorButton href="#newest" isActive>
                {t({ en: "Newest", zh: "最新" })}
              </AnchorButton>
              <AnchorButton href="#popular">
                {t({ en: "Popular", zh: "热门" })}
              </AnchorButton>
              <AnchorButton href="#top">
                {t({ en: "Top rated", zh: "高分" })}
              </AnchorButton>
            </AnchorButtonGroup>
          </ShowcaseItem>
          <ShowcaseItem label="with icon">
            <AnchorButtonGroup>
              <AnchorButton
                href="#all"
                icon={<SlidersHorizontalIcon weight="bold" />}
                isActive
              >
                {t({ en: "All", zh: "全部" })}
              </AnchorButton>
              <AnchorButton href="#movies">
                {t({ en: "Movies", zh: "电影" })}
              </AnchorButton>
              <AnchorButton href="#shows">
                {t({ en: "Shows", zh: "剧集" })}
              </AnchorButton>
            </AnchorButtonGroup>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Button } from "@tuja/ui/components/button";

<Button variant="primary" icon={<PlusIcon weight="bold" />}>
  Add to list
</Button>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              description: t({
                en: "Visible label. Required unless aria-label or aria-labelledby names an icon-only button.",
                zh: "可见标签。除非用 aria-label 或 aria-labelledby 为纯图标按钮命名，否则必填。",
              }),
            },
            {
              name: "aria-label | aria-labelledby",
              type: "string",
              description: t({
                en: "For icon-only buttons (no children), exactly one is required to supply the accessible name.",
                zh: "对于纯图标按钮（无 children），必须二选一以提供可访问名称。",
              }),
            },
            {
              name: "size",
              type: '"sm" | "md" | "lg"',
              defaultValue: '"md"',
              description: t({
                en: 'Height ramp via controlSize. "lg" is for prominent CTAs; reserve "sm" for pointer-dense desktop toolbars.',
                zh: '基于 controlSize 的高度梯度。"lg" 用于醒目的 CTA；"sm" 建议仅用于指针密集的桌面工具栏。',
              }),
            },
            {
              name: "variant",
              type: '"primary"',
              description: t({
                en: "One-shot CTA highlight. Unlike isActive, it does not emit aria-pressed.",
                zh: "一次性 CTA 高亮。与 isActive 不同，它不会发出 aria-pressed。",
              }),
            },
            {
              name: "isActive",
              type: "boolean",
              description: t({
                en: "Toggles the active highlight and emits aria-pressed — use for toggle buttons.",
                zh: "切换激活高亮并发出 aria-pressed——用于切换按钮。",
              }),
            },
            {
              name: "bright",
              type: "boolean",
              description: t({
                en: "Lifts the button onto a bright surface, brightening further on hover.",
                zh: "将按钮置于明亮表面，悬停时进一步提亮。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Decorative leading glyph, rendered aria-hidden; never the accessible name.",
                zh: "装饰性前置图标，以 aria-hidden 渲染；绝不作为可访问名称。",
              }),
            },
            {
              name: "hideLabelOnMobile",
              type: "boolean",
              description: t({
                en: "Below the md breakpoint, collapses to the icon and hides the label.",
                zh: "在 md 断点以下，收起为图标并隐藏标签。",
              }),
            },
            {
              name: "disabled",
              type: "boolean",
              description: t({
                en: "Disables the button and suppresses the press animation.",
                zh: "禁用按钮并抑制按压动画。",
              }),
            },
            {
              name: "labelId",
              type: "string",
              description: t({
                en: "Id applied to the label span, e.g. to wire an external aria-labelledby.",
                zh: "应用于标签 span 的 id，例如用于关联外部的 aria-labelledby。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides merged last — the config-layer escape hatch.",
                zh: "最后合并的 StyleX 覆盖样式——配置层的逃生舱。",
              }),
            },
            {
              name: "…button attributes",
              type: 'ComponentProps<"button">',
              defaultValue: 'type="button"',
              description: t({
                en: "Native button props (onClick, type, name, …) are forwarded to the element.",
                zh: "原生 button 属性（onClick、type、name 等）会转发到元素。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={t({ en: "Delete", zh: "删除" })}
            />
          }
          doCaption={t({
            en: "Pass the glyph through icon and name an icon-only button with aria-label.",
            zh: "通过 icon 传入图标，并用 aria-label 为纯图标按钮命名。",
          })}
          dont={
            <Button>
              <TrashIcon weight="bold" />
            </Button>
          }
          dontCaption={t({
            en: "Don't put a bare icon in children — the button then ships with no accessible name.",
            zh: "不要把裸图标直接放进 children——这样按钮会缺少可访问名称。",
          })}
        />
      </Showcase>
    </>
  );
}
