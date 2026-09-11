import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { SelectAllGroup } from "./checkbox-specimens.tsx";

export function CheckboxShowcase() {
  const exampleLabel = t({ en: "Example option", zh: "示例选项" });
  return (
    <>
      <Showcase label={t({ en: "States", zh: "状态" })}>
        <SpecimenGrid>
          <Specimen caption="unchecked">
            <Checkbox label={exampleLabel} labelHidden />
          </Specimen>
          <Specimen caption="checked">
            <Checkbox label={exampleLabel} labelHidden defaultChecked />
          </Specimen>
          <Specimen caption="indeterminate">
            <Checkbox label={exampleLabel} labelHidden indeterminate />
          </Specimen>
          <Specimen caption="disabled">
            <Checkbox label={exampleLabel} labelHidden disabled />
          </Specimen>
          <Specimen caption="disabled checked">
            <Checkbox
              label={exampleLabel}
              labelHidden
              disabled
              defaultChecked
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Label and description", zh: "标签与说明" })}>
        <div css={styles.stack}>
          <Specimen caption={t({ en: "with description", zh: "带说明文字" })}>
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
          </Specimen>
          <Specimen caption={t({ en: "with error", zh: "带错误提示" })}>
            <Checkbox
              label={t({ en: "Accept the terms", zh: "接受条款" })}
              error={t({
                en: "You must accept the terms to continue.",
                zh: "必须接受条款才能继续。",
              })}
            />
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <div css={styles.stack}>
          <Specimen caption="sm">
            <Checkbox
              size="sm"
              label={t({ en: "Small checkbox", zh: "小号复选框" })}
              defaultChecked
            />
          </Specimen>
          <Specimen caption="md">
            <Checkbox
              size="md"
              label={t({ en: "Medium checkbox", zh: "中号复选框" })}
              defaultChecked
            />
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Controlled select-all", zh: "受控的全选" })}>
        <div css={styles.stack}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A parent checkbox reflects its children: checked when all are on, indeterminate when only some are.",
              zh: "父级复选框反映其子项：全部选中时为已选，部分选中时为中间态。",
            })}
          </Text>
          <Specimen
            caption={t({ en: "indeterminate parent", zh: "父项半选状态" })}
          >
            <SelectAllGroup />
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="checkbox" />

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
});
