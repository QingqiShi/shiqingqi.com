import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Textarea } from "@tuja/ui/components/textarea";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

const USAGE = `import { Textarea } from "@tuja/ui/components/textarea";

<Textarea
  label="Review"
  autoGrow
  description="Grows to fit as you type."
  placeholder="Share your thoughts…"
/>`;

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
        <div css={styles.grid}>
          <Textarea
            label={t({ en: "Notes", zh: "备注" })}
            placeholder={t({
              en: "Fixed three rows; drag the corner to resize.",
              zh: "固定三行；拖动右下角可调整大小。",
            })}
          />
          <Textarea
            label={t({ en: "Review", zh: "评论" })}
            autoGrow
            defaultValue={longReview}
            description={t({
              en: "autoGrow expands to fit the content and hides the resize handle.",
              zh: "autoGrow 会自动增高以适应内容，并隐藏调整手柄。",
            })}
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Description and rows", zh: "说明与行数" })}>
        <div css={styles.grid}>
          <Textarea
            label={t({ en: "Bio", zh: "简介" })}
            rows={5}
            description={t({
              en: "rows sets the initial visible height in the fixed mode.",
              zh: "rows 决定固定模式下初始可见高度。",
            })}
          />
          <Textarea
            label={t({ en: "Feedback", zh: "反馈" })}
            defaultValue={t({ en: "Too short", zh: "太短" })}
            error={t({
              en: "Please add at least 20 characters.",
              zh: "请至少输入 20 个字符。",
            })}
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Sizes and disabled", zh: "尺寸与禁用" })}>
        <div css={styles.grid}>
          <Textarea
            size="sm"
            label={t({ en: "Small", zh: "小" })}
            placeholder={t({ en: 'size="sm"', zh: 'size="sm"' })}
          />
          <Textarea
            disabled
            label={t({ en: "Locked note", zh: "已锁定备注" })}
            defaultValue={t({
              en: "This field is read-only.",
              zh: "此字段为只读。",
            })}
          />
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
              en: "Visible label naming the field; required for an accessible name even when hidden.",
              zh: "命名字段的可见标签；即使被隐藏，也是无障碍名称所必需的。",
            }),
          },
          {
            name: "labelHidden",
            type: "boolean",
            defaultValue: "false",
            description: t({
              en: "Visually hide the label while keeping it in the accessibility tree.",
              zh: "在视觉上隐藏标签，同时保留在无障碍树中。",
            }),
          },
          {
            name: "description",
            type: "string",
            description: t({
              en: "Helper text under the label, wired to the textarea via aria-describedby.",
              zh: "标签下方的说明文字，通过 aria-describedby 关联到文本框。",
            }),
          },
          {
            name: "error",
            type: "string",
            description: t({
              en: 'Error message; sets aria-invalid, renders with role="alert", and joins aria-describedby.',
              zh: '错误消息；设置 aria-invalid，以 role="alert" 渲染，并加入 aria-describedby。',
            }),
          },
          {
            name: "size",
            type: '"sm" | "md" | "lg"',
            defaultValue: '"md"',
            description: t({
              en: "Control scale driving padding and minimum height.",
              zh: "控件尺寸，决定内边距和最小高度。",
            }),
          },
          {
            name: "autoGrow",
            type: "boolean",
            defaultValue: "false",
            description: t({
              en: "Grow to fit content instead of scrolling, disabling the manual resize handle.",
              zh: "随内容自动增高而非滚动，并禁用手动调整手柄。",
            }),
          },
          {
            name: "rows",
            type: "number",
            defaultValue: "3",
            description: t({
              en: "Initial visible text rows in the fixed-height mode.",
              zh: "固定高度模式下初始可见的文本行数。",
            }),
          },
          {
            name: "required",
            type: "boolean",
            description: t({
              en: "Sets the native required attribute and appends an asterisk to the label.",
              zh: "设置原生 required 属性，并在标签后追加星号。",
            }),
          },
          {
            name: "id",
            type: "string",
            description: t({
              en: "Control id; auto-generated with useId when omitted.",
              zh: "控件 id；省略时通过 useId 自动生成。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX overrides merged over the textarea — the escape hatch.",
              zh: "合并到文本框上的 StyleX 覆盖样式——逃生舱口。",
            }),
          },
          {
            name: "...native",
            type: 'ComponentProps<"textarea">',
            description: t({
              en: "Forwarded to the underlying textarea (value, defaultValue, onChange, disabled, ref).",
              zh: "转发给底层 textarea（value、defaultValue、onChange、disabled、ref）。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <div css={styles.fill}>
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
          <div css={styles.fill}>
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
  fill: {
    inlineSize: "100%",
  },
});
