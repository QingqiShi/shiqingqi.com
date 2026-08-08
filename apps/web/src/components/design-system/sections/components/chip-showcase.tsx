import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { BookmarkIcon } from "@phosphor-icons/react/dist/ssr/Bookmark";
import { FunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Chip } from "@tuja/ui/components/chip";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function ChipShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Chip size="sm">{t({ en: "Small", zh: "小" })}</Chip>
          </Specimen>
          <Specimen caption="md">
            <Chip size="md">{t({ en: "Medium", zh: "中" })}</Chip>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "States", zh: "状态" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Chip>{t({ en: "Unselected", zh: "未选中" })}</Chip>
          </Specimen>
          <Specimen caption="isActive">
            <Chip isActive>{t({ en: "Selected", zh: "已选中" })}</Chip>
          </Specimen>
          <Specimen caption="disabled">
            <Chip disabled>{t({ en: "Disabled", zh: "已禁用" })}</Chip>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Slots", zh: "插槽" })}>
        <SpecimenGrid>
          <Specimen caption="icon">
            <Chip icon={<FunnelIcon weight="bold" />}>
              {t({ en: "Genre", zh: "类型" })}
            </Chip>
          </Specimen>
          <Specimen caption="trailing">
            <Chip icon={<BookmarkIcon weight="bold" />} trailing="12">
              {t({ en: "Watchlist", zh: "待看清单" })}
            </Chip>
          </Specimen>
          <Specimen caption="isActive">
            <Chip isActive icon={<BookmarkIcon weight="bold" />} trailing="12">
              {t({ en: "Watchlist", zh: "待看清单" })}
            </Chip>
          </Specimen>
        </SpecimenGrid>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The icon is decorative and hidden from assistive tech; the trailing slot stays announced, so the second chip reads as “Watchlist12”. Trailing content is set back a step with the muted token — but on the selected fill it takes the label's colour, since dimming an already-tight pairing would drop it below the contrast floor.",
            zh: "图标为装饰性内容，对辅助技术隐藏；尾部插槽仍会被朗读，因此第二个标签按钮读作 “Watchlist12”。尾部内容以弱化色标记退后一层——但在选中态的填充上会改用标签本身的颜色，因为在本已紧凑的对比配对上再做减淡会跌破对比度下限。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "As a link", zh: "作为链接" })}>
        <Specimen caption="href">
          <Chip
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer noopener"
            trailing={<ArrowSquareOutIcon weight="bold" />}
          >
            {t({ en: "Open on TMDB", zh: "在 TMDB 打开" })}
          </Chip>
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Passing href renders a real anchor, so the chip is announced as a link and forwards target and rel. A link is not a toggle — mark the current one with aria-current rather than isActive.",
            zh: "传入 href 会渲染真实的锚点元素，因此该标签按钮会被识别为链接，并可转发 target 与 rel。链接不是开关——请用 aria-current 标记当前项，而非 isActive。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import * as stylex from "@stylexjs/stylex";
import { chipSize, chipSurface } from "@tuja/ui/components/chip.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";

// For a framework <Link>, compose the surface directly.
<Link
  href={href}
  {...stylex.props(chipSurface.base, chipSize.md, chipSurface.interactive, transition.colors)}
>
  …
</Link>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Chip contents — usually a short label.",
                zh: "标签按钮的内容——通常是简短标签。",
              }),
            },
            {
              name: "href",
              type: "string",
              description: t({
                en: "Renders an anchor instead of a button, and forwards the rest of the native anchor attributes.",
                zh: "渲染为锚点而非按钮，并转发其余原生锚点属性。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Decorative leading icon, rendered aria-hidden.",
                zh: "装饰性前置图标，以 aria-hidden 渲染。",
              }),
            },
            {
              name: "trailing",
              type: "ReactNode",
              description: t({
                en: "Trailing content — a count, a note, a caret. Unlike the icon it stays in the accessibility tree.",
                zh: "尾部内容——计数、备注或箭头。与图标不同，它保留在无障碍树中。",
              }),
            },
            {
              name: "size",
              type: '"sm" | "md"',
              defaultValue: '"md"',
              description: t({
                en: "Height and type scale.",
                zh: "高度与字号阶梯。",
              }),
            },
            {
              name: "isActive",
              type: "boolean",
              description: t({
                en: "Paints the chip as selected. On the button form it also emits aria-pressed; the anchor form is visual only.",
                zh: "将标签按钮绘制为选中态。按钮形态同时输出 aria-pressed；锚点形态仅有视觉效果。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last so a caller can win over the defaults.",
                zh: "最后合成的 StyleX 覆盖样式，使调用方可覆盖默认值。",
              }),
            },
            {
              name: "…native attributes",
              type: 'ComponentProps<"a"> | ComponentProps<"button">',
              description: t({
                en: "Whichever element href selects: the anchor form forwards target and rel, the button form onClick, disabled and type.",
                zh: "取决于 href 选中的元素：锚点形态转发 target 与 rel，按钮形态转发 onClick、disabled 与 type。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <>
              <Chip isActive>{t({ en: "Now playing", zh: "正在上映" })}</Chip>
              <Chip>{t({ en: "Upcoming", zh: "即将上映" })}</Chip>
            </>
          }
          doCaption={t({
            en: "Reach for a Chip when the pill does something — filtering, selecting, navigating. It is focusable and announced with a role.",
            zh: "当胶囊形元素有实际行为时使用标签按钮——筛选、选择或跳转。它可获得焦点，并带有明确的角色语义。",
          })}
          dont={
            <>
              <Badge variant="accent">
                {t({ en: "Now playing", zh: "正在上映" })}
              </Badge>
              <Badge>{t({ en: "Upcoming", zh: "即将上映" })}</Badge>
            </>
          }
          dontCaption={t({
            en: "Don't wire a click handler onto a Badge to fake a filter — a span isn't focusable and screen readers won't announce it as a control.",
            zh: "不要给徽章挂上点击事件来伪装筛选器——span 无法获得焦点，读屏软件也不会将其识别为控件。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  note: {
    maxInlineSize: measure.prose,
  },
});
