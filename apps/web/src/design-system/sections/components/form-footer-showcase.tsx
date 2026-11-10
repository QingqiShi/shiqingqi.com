import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function FormFooterShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "End a form with its actions.",
          zh: "以操作结束表单。",
        })}
        lead={t({
          en: "FormFooter sets the actions of a form at the end of the line under the fields, in reading order, so the main action comes last.",
          zh: "FormFooter 把表单的操作按阅读顺序放在字段下方那一行的末尾，因此主要操作排在最后。",
        })}
      >
        <Example fill>
          <form css={stack.item}>
            <TextField
              label={t({ en: "Folder name", zh: "文件夹名称" })}
              defaultValue="Finance/Receipts"
            />
            <FormFooter>
              <Button look="ghost">{t({ en: "Cancel", zh: "取消" })}</Button>
              <Button look="primary" type="submit">
                {t({ en: "Save changes", zh: "保存更改" })}
              </Button>
            </FormFooter>
          </form>
        </Example>
        <GuideNote>
          {t({
            en: "divider draws a line above the actions, for a form whose last field needs setting apart from them.",
            zh: "divider 在操作上方画一条线，适用于最后一个字段需要与操作分开的表单。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Keep the actions in view on a long form.",
          zh: "在长表单中让操作始终可见。",
        })}
        lead={t({
          en: "With sticky, the actions float on a small pill of Glass at the bottom of the screen while the form scrolls under them, and stay behind at its end. Scroll this form to see it.",
          zh: "设置 sticky 后，表单在操作下方滚动时，操作浮在屏幕底部的一枚小 Glass 胶囊上，到表单末尾时留在原处。滚动这个表单即可看到。",
        })}
      >
        <Specimen caption="sticky">
          <form css={stack.item}>
            <TextField
              label={t({ en: "Payee", zh: "收款方" })}
              defaultValue="Octopus Energy"
            />
            <TextField
              label={t({ en: "Amount", zh: "金额" })}
              inputMode="decimal"
              leading="£"
              defaultValue="64.50"
            />
            <TextField
              label={t({ en: "Date", zh: "日期" })}
              type="date"
              defaultValue="2026-11-10"
            />
            <TextField
              label={t({ en: "Category", zh: "分类" })}
              defaultValue={t({ en: "Bills", zh: "账单" })}
            />
            <Textarea label={t({ en: "Note", zh: "备注" })} />
            <FormFooter sticky>
              <Button look="ghost">{t({ en: "Cancel", zh: "取消" })}</Button>
              <Button look="primary" type="submit">
                {t({ en: "Save transaction", zh: "保存交易" })}
              </Button>
            </FormFooter>
          </form>
        </Specimen>
        <GuideNote>
          {t({
            en: "Put the footer last in the form, because a sticky box stays inside its parent.",
            zh: "把页脚放在表单的最后，因为粘性盒子只在其父元素内停留。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="form-footer" />
    </>
  );
}
