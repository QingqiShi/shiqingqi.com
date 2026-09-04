"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function ButtonShowcase() {
  const searchLabel = t({ en: "Search", zh: "搜索" });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const closeLabel = t({ en: "Close", zh: "关闭" });

  return (
    <>
      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button>{t({ en: "Default", zh: "默认" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button variant="primary">
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </Specimen>
          <Specimen caption="outline">
            <Button variant="outline">
              {t({ en: "Outline", zh: "描边" })}
            </Button>
          </Specimen>
          <Specimen caption="ghost">
            <Button variant="ghost">{t({ en: "Ghost", zh: "无框" })}</Button>
          </Specimen>
          <Specimen caption="danger">
            <Button variant="danger" icon={<TrashIcon weight="bold" />}>
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </Specimen>
          <Specimen caption="active">
            <Button isActive>{t({ en: "Active", zh: "激活" })}</Button>
          </Specimen>
          <Specimen caption="bright">
            <Button bright>{t({ en: "Bright", zh: "明亮" })}</Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Loading", zh: "加载中" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button loading>{t({ en: "Save", zh: "保存" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button variant="primary" loading>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </Specimen>
          <Specimen caption="outline">
            <Button variant="outline" loading icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "The button keeps its width either way. With an icon the spinner takes the icon's place; without one it sits over the label, which stays in the layout reserving its space. Pointer events are off while busy, so a control that can't be used doesn't light up under the cursor.",
            zh: "两种情况下按钮宽度都保持不变。有图标时，加载指示器取代图标；没有图标时，它覆盖在标签之上，而标签仍留在布局中占据原有空间。忙碌期间指针事件被关闭，因此无法使用的控件不会在光标下产生响应。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Button size="sm">{t({ en: "Small", zh: "小" })}</Button>
          </Specimen>
          <Specimen caption="md">
            <Button size="md">{t({ en: "Medium", zh: "中" })}</Button>
          </Specimen>
          <Specimen caption="lg">
            <Button size="lg">{t({ en: "Large", zh: "大" })}</Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <SpecimenGrid>
          <Specimen caption="leading icon">
            <Button icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </Specimen>
          <Specimen caption="primary + icon">
            <Button variant="primary" icon={<ArrowRightIcon weight="bold" />}>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Icon-only", zh: "纯图标" })}>
        <ShowcaseHelper>
          {t({
            en: "With no children the button renders icon-only: a square of its own height, at the corner radius half that height gives — named by aria-label or aria-labelledby, since the icon itself is decorative.",
            zh: "没有 children 时，按钮渲染为纯图标：一个与自身高度相等的正方形，圆角为该高度的一半——由 aria-label 或 aria-labelledby 命名，因为图标本身是装饰性的。",
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Button
              size="sm"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="md">
            <Button
              size="md"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="lg">
            <Button
              size="lg"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
        </SpecimenGrid>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="ghost">
            <Button
              variant="ghost"
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="outline">
            <Button
              variant="outline"
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
        </SpecimenGrid>
        <SpecimenGrid>
          <Specimen caption="enabled">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="disabled">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
              disabled
            />
          </Specimen>
        </SpecimenGrid>
        <DoDont
          do={<Button icon={<XIcon weight="bold" />} aria-label={closeLabel} />}
          doCaption={t({
            en: "Name an icon-only button with aria-label — required at the type level, so it cannot ship silent.",
            zh: "为纯图标按钮提供 aria-label——类型层面强制要求，因此它不可能在无名状态下发布。",
          })}
          dont={
            <div css={styles.dontGroup}>
              {/* A drawing of the mistake, not the mistake itself: a real
                  icon-only Button here would refuse to compile without an
                  aria-label. */}
              <span css={[corner.radius_2, styles.fauxIconOnly]} aria-hidden>
                <FloppyDiskIcon weight="bold" />
              </span>
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Save changes", zh: "保存更改" })}
              </Text>
            </div>
          }
          dontCaption={t({
            en: "Don't rely on nearby visible text as the only name — a screen reader never associates it with the button the way aria-label or aria-labelledby does.",
            zh: "不要仅依赖旁边的可见文字充当唯一名称——屏幕阅读器不会像 aria-label 或 aria-labelledby 那样把它与按钮关联起来。",
          })}
        />
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button disabled>{t({ en: "Default", zh: "默认" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button variant="primary" disabled>
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
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
                en: 'Height scale via controlSize. "lg" is for prominent CTAs; reserve "sm" for pointer-dense desktop toolbars.',
                zh: '基于 controlSize 的高度阶梯。"lg" 用于醒目的 CTA；"sm" 建议仅用于指针密集的桌面工具栏。',
              }),
            },
            {
              name: "variant",
              type: '"primary" | "outline" | "ghost" | "danger"',
              description: t({
                en: 'Visual treatment; omit for the default raised button. "primary" is the one-shot CTA highlight and, unlike isActive, does not emit aria-pressed. "outline" swaps the fill for a border; "ghost" has no surface at all and holds its colour back until hover, for an affordance inline over existing content. "danger" is for the action that actually destroys something.',
                zh: '视觉样式；省略则为默认的凸起按钮。"primary" 是一次性 CTA 高亮，与 isActive 不同，它不会发出 aria-pressed。"outline" 以描边取代填充；"ghost" 完全没有表面，颜色在悬停前保持克制，适合置于已有内容之上的行内控件。"danger" 用于真正具有破坏性的操作。',
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
                en: "Decorative icon, rendered aria-hidden; never the accessible name. With no children the button renders icon-only: a square of its own height, named by aria-label or aria-labelledby.",
                zh: "装饰性图标，以 aria-hidden 渲染；绝不作为可访问名称。当没有 children 时，按钮渲染为纯图标：一个与自身高度相等的正方形，由 aria-label 或 aria-labelledby 命名。",
              }),
            },
            {
              name: "hideLabelOnMobile",
              type: "boolean",
              description: t({
                en: "Below the md breakpoint, collapses to the square icon-only form — pass aria-label too, so the collapsed button keeps its name.",
                zh: "在 md 断点以下，收起为纯图标的正方形形态——请同时提供 aria-label，使收起后的按钮仍保留名称。",
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
            en: "Pass the icon through icon and name an icon-only button with aria-label.",
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

const styles = stylex.create({
  dontGroup: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
  // Sized and coloured like the real icon-only Button it stands in for.
  fauxIconOnly: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: font.uiHeading3,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
  },
});
