import { Select } from "@tuja/ui/components/select";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { LiveSelect } from "./select-specimens.tsx";

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
        <SpecimenGrid>
          <Specimen caption={t({ en: "label and options", zh: "标签与选项" })}>
            <Select
              label={t({ en: "Sort by", zh: "排序方式" })}
              options={sortOptions}
              defaultValue="newest"
            />
          </Specimen>
          <Specimen caption={t({ en: "with description", zh: "带说明文字" })}>
            <Select
              label={t({ en: "Plan", zh: "套餐" })}
              description={t({
                en: "A disabled option stays listed but can't be picked.",
                zh: "禁用的选项仍会列出，但无法被选择。",
              })}
              options={planOptions}
              defaultValue="pro"
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Placeholder and error", zh: "占位与错误" })}>
        <SpecimenGrid>
          <Specimen caption="placeholder">
            <Select
              label={t({ en: "Country", zh: "国家/地区" })}
              placeholder={t({ en: "Select a country", zh: "选择国家/地区" })}
              options={[
                {
                  value: "us",
                  label: t({ en: "United States", zh: "美国" }),
                },
                { value: "cn", label: t({ en: "China", zh: "中国" }) },
                {
                  value: "gb",
                  label: t({ en: "United Kingdom", zh: "英国" }),
                },
              ]}
            />
          </Specimen>
          <Specimen caption="error">
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
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase
        label={t({ en: "Sizes and option groups", zh: "尺寸与选项分组" })}
      >
        <SpecimenGrid>
          <Specimen caption="sm">
            <Select
              size="sm"
              label={t({ en: "Small", zh: "小" })}
              options={sortOptions}
              defaultValue="newest"
            />
          </Specimen>
          <Specimen caption="lg">
            <Select
              size="lg"
              label={t({ en: "Large", zh: "大" })}
              options={sortOptions}
              defaultValue="newest"
            />
          </Specimen>
          <Specimen caption="optgroup">
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
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "交互" })}>
        <Specimen caption={t({ en: "controlled", zh: "受控" })}>
          <LiveSelect />
        </Specimen>
      </Showcase>

      <PropsTable component="select" />

      <DoDont
        do={
          <div css={fill.inline}>
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
          <div css={fill.inline}>
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
