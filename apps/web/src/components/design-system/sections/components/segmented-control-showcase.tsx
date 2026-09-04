"use client";

import { GridFourIcon } from "@phosphor-icons/react/dist/ssr/GridFour";
import { ListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { RowsIcon } from "@phosphor-icons/react/dist/ssr/Rows";
import * as stylex from "@stylexjs/stylex";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { measure } from "../../measure.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Each icon is decorative and sits beside its label. Keep the label visible wherever there is room: an icon alone leaves a reader guessing at what the view is.",
            zh: "每个图标都是装饰性的，位于标签旁边。只要有空间就保留可见标签：只有图标会让读者猜测该视图究竟是什么。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Icon-only", zh: "纯图标" })}>
        <Specimen caption="hideLabels">
          <IconOnlyViewControl />
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
              type: 'readonly { value: TValue; label: ReactNode; icon?: ReactNode; "aria-label"?: string }[]',
              required: true,
              description: t({
                en: "Ordered segments. Arrow-key navigation follows this order; each icon is decorative. An option's aria-label replaces its label as the accessible name when the visible text does not say enough.",
                zh: "有序的分段列表。方向键导航按此顺序进行；图标均为装饰性内容。当可见文字不足以说明时，选项的 aria-label 会取代 label 作为无障碍名称。",
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
                en: "Called with the next value on click or keyboard select — including a click on the already-selected segment, so a consumer can treat a repeat as its own step (a sort field flipping direction).",
                zh: "点击或键盘选择时以下一个值调用——包括点击已选中的分段时，因此调用方可以把重复点击当作独立的一步来处理（例如排序字段切换方向）。",
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
              name: "hideLabels",
              type: "boolean",
              description: t({
                en: "Collapses every segment to its icon, for a tight bar. Each label stays in the accessibility tree as the segment's name, so every option needs an icon too.",
                zh: "将每个分段收起为图标，用于紧凑的控件条。每个 label 仍留在无障碍树中作为该分段的名称，因此每个选项也都需要提供 icon。",
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

/** The movie database's own poster grid / table switch, icons standing alone. */
function IconOnlyViewControl() {
  const [view, setView] = useState<"grid" | "table">("grid");
  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      hideLabels
      value={view}
      onChange={setView}
      options={[
        {
          value: "grid",
          label: t({ en: "Poster grid", zh: "海报网格" }),
          icon: <GridFourIcon weight="bold" />,
        },
        {
          value: "table",
          label: t({ en: "Table", zh: "表格" }),
          icon: <RowsIcon weight="bold" />,
        },
      ]}
    />
  );
}

/** Holds the selected view — `SegmentedControl` is controlled by contract. */
function ViewControl({
  options,
  size,
  fullWidth,
}: {
  /** Ordered segments, exactly as `SegmentedControl` takes them. */
  options: readonly { value: string; label: ReactNode; icon?: ReactNode }[];
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  const [view, setView] = useState(options[0].value);

  return (
    <SegmentedControl
      aria-label={t({ en: "View", zh: "视图" })}
      options={options}
      value={view}
      onChange={setView}
      size={size}
      fullWidth={fullWidth}
    />
  );
}

const styles = stylex.create({
  note: {
    maxInlineSize: measure.prose,
  },
});
