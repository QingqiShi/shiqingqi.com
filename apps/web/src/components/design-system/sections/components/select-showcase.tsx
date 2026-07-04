"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

const USAGE = `import { Select } from "@tuja/ui/components/select";

<Select
  label="Sort by"
  placeholder="Choose an order"
  options={[
    { value: "newest", label: "Newest" },
    { value: "top", label: "Top rated" },
  ]}
/>`;

function LiveSelect() {
  const genres = [
    { value: "action", label: t({ en: "Action", zh: "动作" }) },
    { value: "drama", label: t({ en: "Drama", zh: "剧情" }) },
    { value: "comedy", label: t({ en: "Comedy", zh: "喜剧" }) },
  ];
  const [value, setValue] = useState("");
  const selected = genres.find((genre) => genre.value === value);
  return (
    <div css={styles.liveStack}>
      <div css={styles.constrained}>
        <Select
          label={t({ en: "Genre", zh: "类型" })}
          placeholder={t({ en: "Pick a genre", zh: "选择类型" })}
          options={genres}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </div>
      <Text variant="bodySmall" tone="muted">
        {t({ en: "onChange →", zh: "onChange →" })}{" "}
        <span css={styles.stateValue}>
          {selected ? selected.label : t({ en: "none", zh: "无" })}
        </span>
      </Text>
    </div>
  );
}

export function SelectShowcase() {
  const sortOptions = [
    { value: "newest", label: t({ en: "Newest", zh: "最新" }) },
    { value: "popular", label: t({ en: "Popular", zh: "热门" }) },
    { value: "top", label: t({ en: "Top rated", zh: "高分" }) },
  ];
  const planOptions = [
    { value: "free", label: t({ en: "Free", zh: "免费" }) },
    { value: "pro", label: t({ en: "Pro", zh: "专业版" }) },
    {
      value: "enterprise",
      label: t({ en: "Enterprise (contact us)", zh: "企业版（联系我们）" }),
      disabled: true,
    },
  ];
  return (
    <>
      <Showcase label={t({ en: "From options", zh: "使用 options" })}>
        <div css={styles.grid}>
          <Select
            label={t({ en: "Sort by", zh: "排序方式" })}
            options={sortOptions}
            defaultValue="newest"
          />
          <Select
            label={t({ en: "Plan", zh: "套餐" })}
            description={t({
              en: "A disabled option stays listed but can't be picked.",
              zh: "禁用的选项仍会列出，但无法被选择。",
            })}
            options={planOptions}
            defaultValue="pro"
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Placeholder and error", zh: "占位与错误" })}>
        <div css={styles.grid}>
          <Select
            label={t({ en: "Country", zh: "国家/地区" })}
            placeholder={t({ en: "Select a country", zh: "选择国家/地区" })}
            options={[
              { value: "us", label: t({ en: "United States", zh: "美国" }) },
              { value: "cn", label: t({ en: "China", zh: "中国" }) },
              { value: "gb", label: t({ en: "United Kingdom", zh: "英国" }) },
            ]}
          />
          <Select
            label={t({ en: "Rating", zh: "评级" })}
            placeholder={t({ en: "Choose a rating", zh: "选择评级" })}
            error={t({
              en: "Select a rating to continue.",
              zh: "请选择评级以继续。",
            })}
            options={[
              { value: "g", label: "G" },
              { value: "pg", label: "PG" },
              { value: "r", label: "R" },
            ]}
          />
        </div>
      </Showcase>

      <Showcase
        label={t({ en: "Sizes and option groups", zh: "尺寸与选项分组" })}
      >
        <div css={styles.grid}>
          <Select
            size="sm"
            label={t({ en: "Small", zh: "小" })}
            options={sortOptions}
            defaultValue="newest"
          />
          <Select
            label={t({ en: "Timezone", zh: "时区" })}
            description={t({
              en: "Pass <option> children for optgroups — the escape hatch.",
              zh: "传入 <option> 子元素以使用 optgroup——逃生舱口。",
            })}
            defaultValue="gmt"
          >
            <optgroup label={t({ en: "Americas", zh: "美洲" })}>
              <option value="est">Eastern (UTC-5)</option>
              <option value="pst">Pacific (UTC-8)</option>
            </optgroup>
            <optgroup label={t({ en: "Europe", zh: "欧洲" })}>
              <option value="gmt">London (UTC+0)</option>
              <option value="cet">Berlin (UTC+1)</option>
            </optgroup>
          </Select>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "交互" })}>
        <LiveSelect />
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable
        rows={[
          {
            name: "label",
            type: "string",
            required: true,
            description: t({
              en: "Visible text naming the select; required for an accessible name even when hidden.",
              zh: "命名下拉框的可见文本；即使被隐藏，也是无障碍名称所必需的。",
            }),
          },
          {
            name: "labelHidden",
            type: "boolean",
            defaultValue: "false",
            description: t({
              en: "Visually hide the label while keeping it as the accessible name.",
              zh: "在视觉上隐藏标签，同时保留为无障碍名称。",
            }),
          },
          {
            name: "description",
            type: "string",
            description: t({
              en: "Supporting copy beneath the control, wired via aria-describedby.",
              zh: "控件下方的辅助说明，通过 aria-describedby 关联。",
            }),
          },
          {
            name: "error",
            type: "string",
            description: t({
              en: "Error message beneath the control; flips aria-invalid and joins aria-describedby.",
              zh: "控件下方的错误消息；切换 aria-invalid 并加入 aria-describedby。",
            }),
          },
          {
            name: "options",
            type: "ReadonlyArray<{ value; label; disabled? }>",
            description: t({
              en: "Config-layer choices rendered as <option>s in order.",
              zh: "配置层选项，按顺序渲染为 <option>。",
            }),
          },
          {
            name: "placeholder",
            type: "string",
            description: t({
              en: "Disabled, hidden first option shown until a real value is picked.",
              zh: "被禁用且隐藏的首个选项，在选择真实值前显示。",
            }),
          },
          {
            name: "size",
            type: '"sm" | "md"',
            defaultValue: '"md"',
            description: t({
              en: "Control height and type scale.",
              zh: "控件高度与字号的尺寸。",
            }),
          },
          {
            name: "children",
            type: "ReactNode",
            description: t({
              en: "<option> / <optgroup> elements — the escape hatch when options is not enough.",
              zh: "<option> / <optgroup> 元素——当 options 不够用时的逃生舱口。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX styles merged over the root wrapper — the escape hatch.",
              zh: "合并到根容器上的 StyleX 样式——逃生舱口。",
            }),
          },
          {
            name: "...native",
            type: 'Omit<ComponentProps<"select">, "size" | "children">',
            description: t({
              en: "Forwarded to the native select (value, defaultValue, onChange, name, disabled, ref).",
              zh: "转发给原生 select（value、defaultValue、onChange、name、disabled、ref）。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <div css={styles.fill}>
            <Select
              label={t({ en: "Sort by", zh: "排序方式" })}
              placeholder={t({ en: "Choose an order", zh: "选择排序" })}
              options={sortOptions}
            />
          </div>
        }
        doCaption={t({
          en: "Use a placeholder when there's no sensible default, forcing an explicit choice.",
          zh: "当没有合理默认值时使用占位符，促使用户做出明确选择。",
        })}
        dont={
          <div css={styles.fill}>
            <Select
              label={t({ en: "Notifications", zh: "通知" })}
              options={[
                { value: "on", label: t({ en: "On", zh: "开启" }) },
                { value: "off", label: t({ en: "Off", zh: "关闭" }) },
              ]}
              defaultValue="on"
            />
          </div>
        }
        dontCaption={t({
          en: "Don't use a Select for a simple two-state toggle — reach for a Switch or Checkbox.",
          zh: "不要用下拉选择表示简单的两态开关——请改用 Switch 或复选框。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "1fr 1fr",
    },
    gap: space._4,
    alignItems: "start",
  },
  liveStack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  constrained: {
    maxInlineSize: "20rem",
  },
  fill: {
    inlineSize: "100%",
  },
  stateValue: {
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    color: color.textMain,
    paddingInline: space._1,
    paddingBlock: space._00,
    borderRadius: border.radius_1,
    backgroundColor: color.bgInteractiveRest,
  },
});
