import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import {
  PromptFieldGrowExample,
  PromptFieldRowExample,
} from "./prompt-field-specimens.tsx";

export function PromptFieldShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Keep a prompt and its action in one frame.",
          zh: "让提问与发送按钮在同一个边框内。",
        })}
        lead={t({
          en: "PromptField is a text field with the button that sends it at its end. At size md it is as tall as a Button or a Segmented control, so it sits in a row of controls as one of them.",
          zh: "PromptField 是末端带发送按钮的文本框。size 为 md 时，它与按钮、分段控件等高，因此可以作为一行控件中的一员。",
        })}
      >
        <PromptFieldRowExample />
        <GuideNote>
          {t({
            en: "Enter sends. An Enter that confirms Chinese, Japanese or Korean input does not.",
            zh: "按 Enter 发送。用于确认中文、日文或韩文输入的 Enter 不会发送。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: 'Give the action a Button of size="sm": the field leaves the same space around it on three sides.',
            zh: '操作按钮使用 size="sm" 的 Button：输入框会在它的三边留出相同的间距。',
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The field has no visible label, so label must name it for a screen reader.",
            zh: "输入框没有可见标签，因此 label 必须为读屏软件说明它的名称。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Let a long prompt grow.",
          zh: "让较长的提问自动增高。",
        })}
        lead={t({
          en: "With multiline, the field grows with its text and Shift+Enter starts a new line. Size lg is for the prompt that leads a page.",
          zh: "启用 multiline 后，输入框随文字增高，Shift+Enter 换行。size 为 lg 时用于页面的主提问框。",
        })}
      >
        <PromptFieldGrowExample />
      </GuideSection>

      <PropsTable component="prompt-field" />
    </>
  );
}
