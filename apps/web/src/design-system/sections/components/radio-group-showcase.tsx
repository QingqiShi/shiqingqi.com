import { t } from "@tuja/i18n";
import { RadioGroup } from "@tuja/ui/components/radio-group";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function RadioGroupShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Ask one question with a few plain answers.",
          zh: "用几个简单的答案回答一个问题。",
        })}
        lead={t({
          en: "RadioGroup lists a few answers, one of which is picked. Each answer is a round mark and a label, with a muted line under it where the label alone does not say enough.",
          zh: "RadioGroup 列出几个答案，其中一个被选中。每个答案是一个圆形标记加一个标签，标签说不清时，下方再加一行弱化说明。",
        })}
      >
        <Example>
          <div css={stack.item}>
            <Text id="notify-question" weight="semibold">
              {t({
                en: "When should we notify you?",
                zh: "什么时候通知你？",
              })}
            </Text>
            <RadioGroup
              aria-labelledby="notify-question"
              name="notify"
              defaultValue="needs-me"
              options={[
                {
                  value: "every",
                  label: t({ en: "Every report", zh: "每份报告" }),
                  description: t({
                    en: "One notification each morning.",
                    zh: "每天早上一条通知。",
                  }),
                },
                {
                  value: "needs-me",
                  label: t({
                    en: "Only when something needs me",
                    zh: "仅在有事需要我时",
                  }),
                  description: t({
                    en: "A to-do that only you can do, or one that is due.",
                    zh: "只有你能完成或已到期的待办。",
                  }),
                },
                {
                  value: "never",
                  label: t({ en: "Never", zh: "从不" }),
                },
              ]}
            />
          </div>
        </Example>
        <GuideNote>
          {t({
            en: "The labels name the answers, never the group: name it with the question, through aria-labelledby, or with aria-label.",
            zh: "标签只命名答案，不命名整个组：通过 aria-labelledby 用问题为它命名，或使用 aria-label。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The radios are native and share one name, so the arrow keys move the pick and a form sends the value.",
            zh: "这些单选按钮是原生的，并共用一个 name，因此方向键可移动选择，表单也会提交选中的值。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "For answers that need an icon or more weight, use Option card.",
            zh: "需要图标或更醒目的答案，请使用选项卡片（OptionCard）。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Show an answer that is not open now.",
          zh: "展示暂不可选的答案。",
        })}
        lead={t({
          en: "A disabled option stays in the list, so the reader sees every answer, and the arrow keys skip it. Say why in its description.",
          zh: "被禁用的选项仍留在列表中，读者能看到所有答案，方向键会跳过它。请在说明中写明原因。",
        })}
      >
        <Specimen caption="disabled">
          <RadioGroup
            aria-label={t({ en: "Sync", zh: "同步频率" })}
            name="sync"
            defaultValue="daily"
            options={[
              { value: "daily", label: t({ en: "Daily", zh: "每天" }) },
              { value: "weekly", label: t({ en: "Weekly", zh: "每周" }) },
              {
                value: "hourly",
                label: t({ en: "Every hour", zh: "每小时" }),
                description: t({
                  en: "Your bank allows four syncs a day.",
                  zh: "你的银行每天只允许同步四次。",
                }),
                disabled: true,
              },
            ]}
          />
        </Specimen>
      </GuideSection>

      <PropsTable component="radio-group" />
    </>
  );
}
