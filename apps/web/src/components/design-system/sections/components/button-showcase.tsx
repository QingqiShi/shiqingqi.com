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
import { ShowcaseHelper } from "../../showcase-helper.tsx";
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
          <ShowcaseItem label="outline">
            <Button variant="outline">
              {t({ en: "Outline", zh: "描边" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="ghost">
            <Button variant="ghost">{t({ en: "Ghost", zh: "无框" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="danger">
            <Button variant="danger" icon={<TrashIcon weight="bold" />}>
              {t({ en: "Delete", zh: "删除" })}
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

      <Showcase label={t({ en: "Loading", zh: "加载中" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Button loading>{t({ en: "Save", zh: "保存" })}</Button>
          </ShowcaseItem>
          <ShowcaseItem label="primary">
            <Button variant="primary" loading>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </ShowcaseItem>
          <ShowcaseItem label="outline">
            <Button variant="outline" loading icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </ShowcaseItem>
        </ShowcaseGrid>
        <ShowcaseHelper>
          {t({
            en: "The button keeps its width either way. With an icon the spinner takes the icon's place; without one it sits over the label, which stays in the layout reserving its space. Pointer events are off while busy, so a control that can't be used doesn't light up under the cursor.",
            zh: "两种情况下按钮宽度都保持不变。有图标时，加载指示器取代图标；没有图标时，它覆盖在标签之上，而标签仍留在布局中占据原有空间。忙碌期间指针事件被关闭，因此无法使用的控件不会在光标下产生响应。",
          })}
        </ShowcaseHelper>
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
</Button>

// A form submit: the label holds still while the spinner takes the
// icon's place, and the button disables itself until the action settles.
<Button type="submit" variant="primary" loading={isPending}>
  Save changes
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
              type: '"primary" | "outline" | "ghost" | "danger"',
              description: t({
                en: 'Visual treatment; omit for the default raised button. "primary" is the one-shot CTA highlight and, unlike isActive, does not emit aria-pressed. "outline" and "ghost" step the chrome down for secondary and inline actions; "danger" is for the action that actually destroys something.',
                zh: '视觉样式；省略则为默认的凸起按钮。"primary" 是一次性 CTA 高亮，与 isActive 不同，它不会发出 aria-pressed。"outline" 与 "ghost" 依次减弱外框，用于次要与行内操作；"danger" 用于真正具有破坏性的操作。',
              }),
            },
            {
              name: "loading",
              type: "boolean",
              description: t({
                en: "Marks the button busy: shows a spinner, announces aria-busy, and blocks activation so the action can't fire twice. The block is aria-disabled plus a click guard rather than the native disabled attribute, so the button keeps focus and the busy state is actually heard. Either way the width holds — with an icon the spinner takes its place, without one it sits over the label. Keep the label text as it is.",
                zh: "将按钮标记为忙碌：显示加载指示器，输出 aria-busy，并阻止再次触发。阻止方式为 aria-disabled 加点击拦截，而非原生 disabled 属性，因此按钮保留焦点，忙碌状态才能被真正读出。两种情况下宽度都保持不变——有图标时加载指示器取代图标，没有图标时则覆盖在标签之上。请保持标签文案不变。",
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
