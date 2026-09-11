import { SuitcaseIcon } from "@phosphor-icons/react/dist/ssr/Suitcase";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { DisclosureHeadlessSpecimen } from "./disclosure-specimens.tsx";

export function DisclosureShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Looks", zh: "外观" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="plain">
            <Disclosure
              summary={t({ en: "Packing list", zh: "行李清单" })}
              css={fill.inline}
            >
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "Passport, EU driving licence, and the rental confirmation printed out.",
                  zh: "护照、欧盟驾照，以及打印好的租车确认单。",
                })}
              </Text>
            </Disclosure>
          </Specimen>
          <Specimen caption="card">
            <Disclosure
              look="card"
              summary={t({ en: "Packing list", zh: "行李清单" })}
              css={fill.inline}
            >
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "Passport, EU driving licence, and the rental confirmation printed out.",
                  zh: "护照、欧盟驾照，以及打印好的租车确认单。",
                })}
              </Text>
            </Disclosure>
          </Specimen>
        </div>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Plain is chrome-free, for a disclosure inside a surface something else already owns. Card wraps both parts in the shared bordered surface and rules the panel off from the header.",
            zh: "简洁样式不带外框，适用于外层已有表面的场景。卡片样式将标题与面板一同包进共享的描边表面，并用分隔线将面板与标题分开。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Slots", zh: "插槽" })}>
        <Specimen caption="icon + trailing">
          <Disclosure
            look="card"
            defaultOpen
            icon={<SuitcaseIcon weight="bold" />}
            trailing={<Badge intent="neutral">2/5</Badge>}
            summary={t({ en: "Packing list", zh: "行李清单" })}
            css={fill.inline}
          >
            <Text look="bodySmall" tone="muted">
              {t({
                en: "Passport, EU driving licence, and the rental confirmation printed out.",
                zh: "护照、欧盟驾照，以及打印好的租车确认单。",
              })}
            </Text>
          </Disclosure>
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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

      <PropsTable component="disclosure" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<DisclosureHeadlessSpecimen />}
          doCaption={t({
            en: "When the header already holds a link, use useDisclosure and give the toggle its own button beside it.",
            zh: "当标题行已包含链接时，使用 useDisclosure，并在旁边为开关设置独立按钮。",
          })}
          dont={
            <Disclosure
              look="card"
              summary={t({ en: "Florence → Siena", zh: "佛罗伦萨 → 锡耶纳" })}
              css={fill.inline}
            >
              <Text look="bodySmall" tone="muted">
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

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
  note: {
    maxInlineSize: measure.prose,
  },
});
