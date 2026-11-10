import { t } from "@tuja/i18n";
import { Textarea } from "@tuja/ui/components/textarea";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";

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

      <Showcase
        label={t({
          en: "Let a ghost field sit in a line of text",
          zh: "让无框字段嵌在一行文字中",
        })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: 'A field in a row of text, such as a step of a checklist, takes look="ghost": no frame or fill until the pointer is over it or it has focus. A done step takes tone="muted" and recedes like its ticked box, until it has focus.',
            zh: '嵌在一行文字中的字段，例如清单中的一个步骤，使用 look="ghost"：在指针悬停或获得焦点之前，没有边框和底色。已完成的步骤使用 tone="muted"，与已勾选的方框一起退后，获得焦点时恢复。',
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption='look="ghost"'>
            <Textarea
              look="ghost"
              size="sm"
              rows={1}
              autoGrow
              label={t({ en: "Step 1", zh: "第 1 步" })}
              labelHidden
              defaultValue={t({
                en: "Book the table for Friday",
                zh: "订好周五的餐桌",
              })}
            />
          </Specimen>
          <Specimen caption='tone="muted"'>
            <Textarea
              look="ghost"
              tone="muted"
              size="sm"
              rows={1}
              autoGrow
              label={t({ en: "Step 2", zh: "第 2 步" })}
              labelHidden
              defaultValue={t({
                en: "Send the invitations",
                zh: "发出邀请",
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
    </>
  );
}
