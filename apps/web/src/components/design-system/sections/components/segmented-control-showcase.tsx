import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { SegmentedControlDemo } from "./segmented-control-demo.tsx";

export function SegmentedControlShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <div css={[flex.wrap, styles.row]}>
          <SegmentedControlDemo size="sm" />
          <SegmentedControlDemo size="md" />
        </div>
      </Showcase>

      <Showcase label={t({ en: "With icons", zh: "带图标" })}>
        <SegmentedControlDemo withIcons count={3} />
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Each glyph is decorative and sits beside its label, never instead of it — an icon-only segment leaves the reader guessing at what the view is.",
            zh: "每个图标都是装饰性的，位于标签旁边而非取代标签——纯图标的分段会让读者猜测该视图究竟是什么。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Full width", zh: "撑满宽度" })}>
        <SegmentedControlDemo fullWidth count={3} />
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Segments share the track evenly rather than in proportion to their labels, so the widths stay stable as the copy is translated.",
            zh: "各分段均分轨道宽度，而非按标签长短分配，因此文案翻译后宽度保持稳定。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Keyboard", zh: "键盘操作" })}>
        <SegmentedControlDemo count={4} />
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "A full WAI-ARIA radiogroup: Tab reaches the selected segment only, arrow keys move and select, Home and End jump to the ends, and focus follows selection so each choice announces as you land on it.",
            zh: "完整的 WAI-ARIA 单选组：Tab 只会进入已选中的分段，方向键移动并选择，Home 与 End 跳到两端，焦点跟随选择，因此每次落点都会被朗读。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { SegmentedControl } from "@tuja/ui/components/segmented-control";

const [view, setView] = useState<"grid" | "list">("grid");

<SegmentedControl
  aria-label="View"
  value={view}
  onChange={setView}
  options={[
    { value: "grid", label: "Grid" },
    { value: "list", label: "List" },
  ]}
/>

// For an option row that needs its own layout, use the hook the
// control is built on and keep the same keyboard model.
import { useRadioGroup } from "@tuja/ui/hooks/use-radio-group";`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "options",
              type: "readonly { value: TValue; label: ReactNode; icon?: ReactNode }[]",
              required: true,
              description: t({
                en: "Ordered segments. Arrow-key navigation follows this order; each icon is decorative.",
                zh: "有序的分段列表。方向键导航按此顺序进行；图标均为装饰性内容。",
              }),
            },
            {
              name: "value",
              type: "TValue",
              required: true,
              description: t({
                en: "The selected value. Controlled only — the selected view is page state, so the parent owns it.",
                zh: "选中的值。仅支持受控——所选视图属于页面状态，由父组件持有。",
              }),
            },
            {
              name: "onChange",
              type: "(next: TValue) => void",
              required: true,
              description: t({
                en: "Called with the next value on click or keyboard select.",
                zh: "点击或键盘选择时以下一个值调用。",
              }),
            },
            {
              name: "aria-label",
              type: "string",
              description: t({
                en: "Names the radiogroup. Required unless aria-labelledby is given — the segment labels name the options, never the group.",
                zh: "为单选组命名。除非提供 aria-labelledby，否则必填——分段标签只命名选项，不命名整个组。",
              }),
            },
            {
              name: "aria-labelledby",
              type: "string",
              description: t({
                en: "Id of a visible element that names the group. Mutually exclusive with aria-label.",
                zh: "为该组命名的可见元素 id。与 aria-label 互斥。",
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
              name: "fullWidth",
              type: "boolean",
              description: t({
                en: "Stretches the track to fill its container, sharing width equally between segments. A label too long for its share truncates rather than pushing the track wider.",
                zh: "将轨道拉伸至填满容器，各分段均分宽度。超出所分宽度的标签会被截断，而不会把轨道撑宽。",
              }),
            },
            {
              name: "id",
              type: "string",
              description: t({
                en: "Id applied to the track, e.g. so a panel can point aria-controls at it.",
                zh: "应用到轨道上的 id，例如供面板以 aria-controls 指向它。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides merged over the track, composed last so a caller can win.",
                zh: "合并到轨道上的 StyleX 覆盖样式，最后合成，使调用方可覆盖。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<SegmentedControlDemo count={3} />}
          doCaption={t({
            en: "Two to four mutually exclusive views of the same content, all readable at a glance.",
            zh: "同一内容的二至四种互斥视图，一眼即可全部读完。",
          })}
          dont={<SegmentedControlDemo count={7} />}
          dontCaption={t({
            en: "Don't keep adding segments — past four the labels crush, the track outgrows small screens, and the set belongs in a Select.",
            zh: "不要不断增加分段——超过四个后标签会被挤压，轨道在小屏幕上放不下，这样的选项集应改用下拉选择。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  row: {
    alignItems: "center",
    gap: space._3,
  },
  note: {
    maxInlineSize: "65ch",
  },
});
