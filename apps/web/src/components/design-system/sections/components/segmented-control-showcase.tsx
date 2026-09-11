import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import {
  IconOnlyViewControl,
  SortControl,
  ViewControl,
} from "./segmented-control-specimens.tsx";

export function SegmentedControlShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <ViewControl
              size="sm"
              options={[
                { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
                { value: "list", label: t({ en: "List", zh: "列表" }) },
              ]}
            />
          </Specimen>
          <Specimen caption="md">
            <ViewControl
              size="md"
              options={[
                { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
                { value: "list", label: t({ en: "List", zh: "列表" }) },
              ]}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "With icons", zh: "带图标" })}>
        <Specimen caption={t({ en: "decorative icons", zh: "装饰性图标" })}>
          <ViewControl
            options={[
              {
                value: "grid",
                label: t({ en: "Grid", zh: "网格" }),
                icon: <GridFourIcon weight="bold" />,
              },
              {
                value: "list",
                label: t({ en: "List", zh: "列表" }),
                icon: <ListIcon weight="bold" />,
              },
              {
                value: "compact",
                label: t({ en: "Compact", zh: "紧凑" }),
                icon: <RowsIcon weight="bold" />,
              },
            ]}
          />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Each icon is decorative and sits beside its label. Keep the label visible wherever there is room: an icon alone leaves a reader guessing at what the view is.",
            zh: "每个图标都是装饰性的，位于标签旁边。只要有空间就保留可见标签：只有图标会让读者猜测该视图究竟是什么。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Selected-only icon", zh: "仅选中时的图标" })}>
        <Specimen caption="selectedIcon">
          <SortControl />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "selectedIcon rides on the selected segment alone — in this control the sort direction, which a second activation flips. Its spot grows in and shrinks away, so the segments beside it never jump. The selected segment's aria-label carries the direction too, because an arrow says nothing to a screen reader.",
            zh: "selectedIcon 只出现在选中的分段上——在这个控件里是排序方向，再次点击即可翻转。它的位置会展开、也会收起，因此旁边的分段不会跳动。选中分段的 aria-label 同样带上方向，因为箭头对屏幕阅读器什么也没说。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Icon-only", zh: "纯图标" })}>
        <Specimen caption="hideLabels">
          <IconOnlyViewControl />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "hideLabels collapses every segment to its icon for a tight bar — each label still names its segment in the accessibility tree, so every option needs an icon too. This is the movie database's own poster grid / table switch.",
            zh: "hideLabels 会将每个分段收起为图标，用于紧凑的控件条——每个 label 仍在无障碍树中为其分段命名，因此每个选项也都需要提供 icon。这正是影视数据库自身的海报网格／表格切换控件。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Full width", zh: "撑满宽度" })}>
        <Specimen caption={t({ en: "equal shares", zh: "等分宽度" })}>
          <ViewControl
            fullWidth
            options={[
              { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
              { value: "list", label: t({ en: "List", zh: "列表" }) },
              { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
            ]}
          />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Segments share the track evenly rather than in proportion to their labels, so the widths stay stable as the copy is translated.",
            zh: "各分段均分轨道宽度，而非按标签长短分配，因此文案翻译后宽度保持稳定。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Keyboard", zh: "键盘操作" })}>
        <Specimen caption="radiogroup">
          <ViewControl
            options={[
              { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
              { value: "list", label: t({ en: "List", zh: "列表" }) },
              { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
              { value: "table", label: t({ en: "Table", zh: "表格" }) },
            ]}
          />
        </Specimen>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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

      <PropsTable component="segmented-control" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <ViewControl
              options={[
                { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
                { value: "list", label: t({ en: "List", zh: "列表" }) },
                { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
              ]}
            />
          }
          doCaption={t({
            en: "Two to four mutually exclusive views of the same content, all readable at a glance.",
            zh: "同一内容的二至四种互斥视图，一眼即可全部读完。",
          })}
          dont={
            <ViewControl
              options={[
                { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
                { value: "list", label: t({ en: "List", zh: "列表" }) },
                { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
                { value: "table", label: t({ en: "Table", zh: "表格" }) },
                { value: "gallery", label: t({ en: "Gallery", zh: "画廊" }) },
                {
                  value: "timeline",
                  label: t({ en: "Timeline", zh: "时间线" }),
                },
                { value: "map", label: t({ en: "Map", zh: "地图" }) },
              ]}
            />
          }
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
  note: {
    maxInlineSize: measure.prose,
  },
});
