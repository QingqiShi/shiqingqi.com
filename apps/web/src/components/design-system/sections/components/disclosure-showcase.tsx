"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { SuitcaseIcon } from "@phosphor-icons/react/dist/ssr/Suitcase";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Chip } from "@tuja/ui/components/chip";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function DisclosureShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Variants", zh: "样式" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="plain">
            <Disclosure
              summary={t({ en: "Packing list", zh: "行李清单" })}
              css={fill.inline}
            >
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Passport, EU driving licence, and the rental confirmation printed out.",
                  zh: "护照、欧盟驾照，以及打印好的租车确认单。",
                })}
              </Text>
            </Disclosure>
          </Specimen>
          <Specimen caption="card">
            <Disclosure
              variant="card"
              summary={t({ en: "Packing list", zh: "行李清单" })}
              css={fill.inline}
            >
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Passport, EU driving licence, and the rental confirmation printed out.",
                  zh: "护照、欧盟驾照，以及打印好的租车确认单。",
                })}
              </Text>
            </Disclosure>
          </Specimen>
        </div>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Plain is chrome-free, for a disclosure inside a surface something else already owns. Card wraps both parts in the shared bordered surface and rules the panel off from the header.",
            zh: "简洁样式不带外框，适用于外层已有表面的场景。卡片样式将标题与面板一同包进共享的描边表面，并用分隔线将面板与标题分开。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Slots", zh: "插槽" })}>
        <Specimen caption="icon + trailing">
          <Disclosure
            variant="card"
            defaultOpen
            icon={<SuitcaseIcon weight="bold" />}
            trailing={<Badge variant="neutral">2/5</Badge>}
            summary={t({ en: "Packing list", zh: "行李清单" })}
            css={fill.inline}
          >
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Passport, EU driving licence, and the rental confirmation printed out.",
                zh: "护照、欧盟驾照，以及打印好的租车确认单。",
              })}
            </Text>
          </Disclosure>
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Both slots render inside the trigger, so neither may be interactive — a count or a status badge, never a button. The icon is hidden from assistive tech but trailing is not: a count is content, and the trigger announces as “Packing list 2/5”. defaultOpen starts this one expanded.",
            zh: "两个插槽都渲染在触发器内部，因此都不能是可交互元素——只能是计数或状态标记，绝不能是按钮。图标对辅助技术隐藏，但 trailing 不隐藏：计数属于内容，触发器会被朗读为「Packing list 2/5」。defaultOpen 让该示例默认展开。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Headless", zh: "无头用法" })}>
        <Specimen caption="useDisclosure">
          <DisclosureHeadlessSpecimen />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "When the header holds its own link, the whole row can't be a button. useDisclosure hands the same aria-expanded and aria-controls wiring to a separate toggle beside it.",
            zh: "当标题行自身包含链接时，整行不能是按钮。useDisclosure 会把同样的 aria-expanded 与 aria-controls 关联交给旁边独立的开关按钮。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { useDisclosure } from "@tuja/ui/hooks/use-disclosure";

// When the header holds its own control, drop to the hook.
const { open, triggerProps, panelProps } = useDisclosure();

<li>
  <a href={route.href}>{route.label}</a>
  <button {...triggerProps}>Map</button>
  <div {...panelProps}>{open ? <MapEmbed src={route.src} /> : null}</div>
</li>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "summary",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Header content. The whole row is the trigger, so keep this to text and decoration.",
                zh: "标题内容。整行即触发器，因此仅应包含文本与装饰。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Panel content, revealed when open.",
                zh: "展开时显示的面板内容。",
              }),
            },
            {
              name: "open",
              type: "boolean",
              description: t({
                en: "Controlled open state. Omit to let the component own it. Passing it requires onOpenChange — while controlled the component cannot change its own state, so a disclosure with no handler would look right and never open.",
                zh: "受控的展开状态。省略则由组件自行管理。传入时必须同时提供 onOpenChange——受控期间组件无法自行改变状态，缺少回调的折叠面板看起来正常却永远打不开。",
              }),
            },
            {
              name: "defaultOpen",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Initial open state when uncontrolled. Not accepted alongside open.",
                zh: "非受控时的初始展开状态。不可与 open 同时使用。",
              }),
            },
            {
              name: "onOpenChange",
              type: "(open: boolean) => void",
              description: t({
                en: "Called with the next state whenever the trigger toggles. Optional when uncontrolled, required alongside open.",
                zh: "每次触发器切换时以下一个状态调用。非受控时可选，与 open 同时使用时必填。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Decorative leading icon in the header, rendered aria-hidden.",
                zh: "标题行的装饰性前置图标，以 aria-hidden 渲染。",
              }),
            },
            {
              name: "trailing",
              type: "ReactNode",
              description: t({
                en: "Content between the summary and the caret — a count, a status badge. It stays in the accessibility tree, so it reads as part of the trigger's name. Must not be interactive.",
                zh: "位于摘要与箭头之间的内容——计数或状态标记。它保留在无障碍树中，因此会作为触发器名称的一部分被朗读。不得为可交互元素。",
              }),
            },
            {
              name: "indicator",
              type: "ReactNode",
              description: t({
                en: "The open/closed indicator. Defaults to a caret that rotates on open; pass null to drop it.",
                zh: "展开／折叠指示符。默认为展开时旋转的箭头；传入 null 可去掉。",
              }),
            },
            {
              name: "variant",
              type: '"plain" | "card"',
              defaultValue: '"plain"',
              description: t({
                en: "Chrome-free, or wrapped in the shared bordered card surface with the panel ruled off.",
                zh: "无外框，或包进共享的描边卡片表面并用分隔线分开面板。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last. The trigger inherits the root's font-size, so one override resizes the whole header.",
                zh: "最后合成的 StyleX 覆盖样式。触发器继承根元素字号，因此一次覆盖即可调整整个标题行。",
              }),
            },
            {
              name: "…div attributes",
              type: 'ComponentProps<"div">',
              description: t({
                en: "Native div attributes (id, data-*, className, style, ref) are forwarded to the root.",
                zh: "原生 div 属性（id、data-*、className、style、ref）会转发到根元素。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<DisclosureHeadlessSpecimen />}
          doCaption={t({
            en: "When the header already holds a link, use useDisclosure and give the toggle its own button beside it.",
            zh: "当标题行已包含链接时，使用 useDisclosure，并在旁边为开关设置独立按钮。",
          })}
          dont={
            <Disclosure
              variant="card"
              summary={t({ en: "Florence → Siena", zh: "佛罗伦萨 → 锡耶纳" })}
              css={fill.inline}
            >
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Route map", zh: "路线地图" })}
              </Text>
            </Disclosure>
          }
          dontCaption={t({
            en: "Don't put a link or a button into summary — the whole header is already a button, and nesting controls breaks the markup, so screen readers announce it as one confused control.",
            zh: "不要把链接或按钮放进 summary——整个标题行本身就是按钮，嵌套控件是无效标记，读屏软件会将其读作一个混乱的控件。",
          })}
        />
      </Showcase>
    </>
  );
}

/**
 * The case the component can't cover: the header holds a link, so it cannot
 * itself be a `<button>`. `useDisclosure` supplies the same ARIA wiring to a
 * separate toggle beside the link.
 */
function DisclosureHeadlessSpecimen() {
  const { open, triggerProps, panelProps } = useDisclosure();

  return (
    <div css={[cardSurface.base, fill.inline]}>
      <div css={styles.header}>
        <a href="#disclosure" css={styles.link}>
          {t({ en: "Florence → Siena", zh: "佛罗伦萨 → 锡耶纳" })}
        </a>
        <Chip
          size="sm"
          {...triggerProps}
          trailing={
            <span
              aria-hidden
              css={[
                transition.transform,
                styles.caret,
                open && styles.caretOpen,
              ]}
            >
              <CaretDownIcon weight="bold" />
            </span>
          }
        >
          {t({ en: "Map", zh: "地图" })}
        </Chip>
      </div>
      <div {...panelProps} css={styles.panel}>
        <Text variant="bodySmall" tone="muted">
          {t({
            en: "The panel stays mounted and flips hidden, so aria-controls always resolves.",
            zh: "面板始终挂载并切换 hidden，因此 aria-controls 始终能解析到元素。",
          })}
        </Text>
      </div>
    </div>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
  note: {
    maxInlineSize: measure.prose,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  link: {
    color: { default: color.textMain, ":hover": color.textMuted },
    textUnderlineOffset: "0.25em",
  },
  caret: {
    display: "inline-flex",
  },
  caretOpen: {
    transform: "rotate(180deg)",
  },
  panel: {
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
  },
});
