"use client";

import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

const USAGE = `import { Checkbox } from "@tuja/ui/components/checkbox";

<Checkbox
  label="Email me about product updates"
  description="Roughly one message a month."
  defaultChecked
/>`;

function SelectAllGroup() {
  const options = [
    t({ en: "Product updates", zh: "产品更新" }),
    t({ en: "Weekly digest", zh: "每周摘要" }),
    t({ en: "Security alerts", zh: "安全提醒" }),
  ];
  const [checked, setChecked] = useState([true, false, false]);
  const selectedCount = checked.filter(Boolean).length;
  const allChecked = selectedCount === checked.length;
  const noneChecked = selectedCount === 0;
  return (
    <div css={styles.group}>
      <Checkbox
        label={t({ en: "All notifications", zh: "全部通知" })}
        checked={allChecked}
        indeterminate={!allChecked && !noneChecked}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(checked.map(() => next));
        }}
      />
      <div css={styles.children}>
        {options.map((label, index) => (
          <Checkbox
            key={label}
            label={label}
            checked={checked[index]}
            onChange={(event) => {
              const next = event.target.checked;
              setChecked(
                checked.map((value, other) => (other === index ? next : value)),
              );
            }}
          />
        ))}
      </div>
      <Text variant="bodySmall" tone="muted">
        {t({ en: "Selected", zh: "已选择" })} {selectedCount} / {checked.length}
      </Text>
    </div>
  );
}

export function CheckboxShowcase() {
  const exampleLabel = t({ en: "Example option", zh: "示例选项" });
  return (
    <>
      <Showcase label={t({ en: "States", zh: "状态" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="unchecked">
            <Checkbox label={exampleLabel} labelHidden />
          </ShowcaseItem>
          <ShowcaseItem label="checked">
            <Checkbox label={exampleLabel} labelHidden defaultChecked />
          </ShowcaseItem>
          <ShowcaseItem label="indeterminate">
            <Checkbox label={exampleLabel} labelHidden indeterminate />
          </ShowcaseItem>
          <ShowcaseItem label="disabled">
            <Checkbox label={exampleLabel} labelHidden disabled />
          </ShowcaseItem>
          <ShowcaseItem label="disabled checked">
            <Checkbox
              label={exampleLabel}
              labelHidden
              disabled
              defaultChecked
            />
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Label and description", zh: "标签与说明" })}>
        <div css={styles.stack}>
          <Checkbox
            label={t({
              en: "Email me about product updates",
              zh: "向我发送产品更新邮件",
            })}
            description={t({
              en: "Roughly one message a month. Unsubscribe anytime.",
              zh: "大约每月一封，可随时退订。",
            })}
            defaultChecked
          />
          <Checkbox
            label={t({ en: "Accept the terms", zh: "接受条款" })}
            error={t({
              en: "You must accept the terms to continue.",
              zh: "必须接受条款才能继续。",
            })}
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <div css={styles.stack}>
          <Checkbox
            size="sm"
            label={t({ en: "Small checkbox", zh: "小号复选框" })}
            defaultChecked
          />
          <Checkbox
            size="md"
            label={t({ en: "Medium checkbox", zh: "中号复选框" })}
            defaultChecked
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Controlled select-all", zh: "受控的全选" })}>
        <div css={styles.stack}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "A parent checkbox reflects its children: checked when all are on, indeterminate when only some are.",
              zh: "父级复选框反映其子项：全部选中时为已选，部分选中时为中间态。",
            })}
          </Text>
          <SelectAllGroup />
        </div>
      </Showcase>

      <UsageSnippet code={USAGE} />

      <PropsTable
        rows={[
          {
            name: "label",
            type: "string",
            required: true,
            description: t({
              en: "Visible text naming the checkbox; required for an accessible name even when hidden.",
              zh: "命名复选框的可见文本；即使被隐藏，也是无障碍名称所必需的。",
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
              en: "Supporting copy beneath the label, wired via aria-describedby.",
              zh: "标签下方的辅助说明，通过 aria-describedby 关联。",
            }),
          },
          {
            name: "error",
            type: "string",
            description: t({
              en: "Error message beneath the label; flips aria-invalid and joins aria-describedby.",
              zh: "标签下方的错误消息；切换 aria-invalid 并加入 aria-describedby。",
            }),
          },
          {
            name: "indeterminate",
            type: "boolean",
            description: t({
              en: "Renders the mixed/partial dash state, reflected onto the DOM node via a ref.",
              zh: "渲染混合/部分选中的横线状态，通过 ref 反映到 DOM 节点。",
            }),
          },
          {
            name: "size",
            type: '"sm" | "md"',
            defaultValue: '"md"',
            description: t({
              en: "Box and type scale.",
              zh: "方框与字号的尺寸。",
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
            type: 'Omit<ComponentProps<"input">, "type" | "size" | "children">',
            description: t({
              en: "Forwarded to the native checkbox (checked, defaultChecked, onChange, name, disabled, ref).",
              zh: "转发给原生复选框（checked、defaultChecked、onChange、name、disabled、ref）。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <div css={styles.stack}>
            <Checkbox
              label={t({ en: "Extra cheese", zh: "加芝士" })}
              defaultChecked
            />
            <Checkbox label={t({ en: "Mushrooms", zh: "蘑菇" })} />
            <Checkbox label={t({ en: "Olives", zh: "橄榄" })} defaultChecked />
          </div>
        }
        doCaption={t({
          en: "Use checkboxes when any number of independent options can be selected together.",
          zh: "当可以同时选择任意数量的独立选项时，使用复选框。",
        })}
        dont={
          <div css={styles.stack}>
            <Checkbox label={t({ en: "Light theme", zh: "浅色主题" })} />
            <Checkbox
              label={t({ en: "Dark theme", zh: "深色主题" })}
              defaultChecked
            />
          </div>
        }
        dontCaption={t({
          en: "Don't use checkboxes for mutually exclusive choices — reach for radios or a Select instead.",
          zh: "不要用复选框表示互斥选项——请改用单选按钮或下拉选择。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  children: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingInlineStart: space._5,
  },
});
