import { Textarea } from "@tuja/ui/components/textarea";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function TextareaShowcase() {
  const longReview = t({
    en: "A quiet, patient film that trusts its audience. The cinematography lingers, and the score never overreaches — a rare balance.",
    zh: "一部安静而耐心的电影，充分信任观众。镜头从容停留，配乐也从不喧宾夺主——难得的平衡。",
  });
  return (
    <>
      <Showcase
        label={t({ en: "Default and auto-grow", zh: "默认与自动增高" })}
      >
        <SpecimenGrid>
          <Specimen caption={t({ en: "fixed rows", zh: "固定行数" })}>
            <Textarea
              label={t({ en: "Notes", zh: "备注" })}
              placeholder={t({
                en: "Fixed three rows; drag the corner to resize.",
                zh: "固定三行；拖动右下角可调整大小。",
              })}
            />
          </Specimen>
          <Specimen caption="autoGrow">
            <Textarea
              label={t({ en: "Review", zh: "评论" })}
              autoGrow
              defaultValue={longReview}
              description={t({
                en: "autoGrow expands to fit the content and hides the resize handle.",
                zh: "autoGrow 会自动增高以适应内容，并隐藏调整手柄。",
              })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Description and rows", zh: "说明与行数" })}>
        <SpecimenGrid>
          <Specimen caption="rows">
            <Textarea
              label={t({ en: "Bio", zh: "简介" })}
              rows={5}
              description={t({
                en: "rows sets the initial visible height in the fixed mode.",
                zh: "rows 决定固定模式下初始可见高度。",
              })}
            />
          </Specimen>
          <Specimen caption="error">
            <Textarea
              label={t({ en: "Feedback", zh: "反馈" })}
              defaultValue={t({ en: "Too short", zh: "太短" })}
              error={t({
                en: "Feedback needs at least 20 characters.",
                zh: "反馈内容至少需要 20 个字符。",
              })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes and disabled", zh: "尺寸与禁用" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Textarea
              size="sm"
              label={t({ en: "Small", zh: "小" })}
              placeholder={t({ en: 'size="sm"', zh: 'size="sm"' })}
            />
          </Specimen>
          <Specimen caption="disabled">
            <Textarea
              disabled
              label={t({ en: "Locked note", zh: "已锁定备注" })}
              defaultValue={t({
                en: "This field is read-only.",
                zh: "此字段为只读。",
              })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <PropsTable component="textarea" />

      <DoDont
        do={
          <div css={fill.inline}>
            <Textarea
              label={t({ en: "Review", zh: "评论" })}
              autoGrow
              defaultValue={longReview}
            />
          </div>
        }
        doCaption={t({
          en: "Use autoGrow (or a generous rows) for open-ended text so the writer sees their whole entry.",
          zh: "对开放式文本使用 autoGrow（或较大的 rows），让作者看到完整内容。",
        })}
        dont={
          <div css={fill.inline}>
            <Textarea
              label={t({ en: "Review", zh: "评论" })}
              rows={1}
              defaultValue={longReview}
            />
          </div>
        }
        dontCaption={t({
          en: "Don't cram long-form input into a single locked row — it hides most of what the user typed.",
          zh: "不要把长文本塞进锁死的一行——那会隐藏用户输入的大部分内容。",
        })}
      />
    </>
  );
}
