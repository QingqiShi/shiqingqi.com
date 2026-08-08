import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import * as stylex from "@stylexjs/stylex";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function TextFieldShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <TextField
              size="sm"
              label={t({ en: "Small", zh: "小" })}
              placeholder={t({ en: "sm", zh: "小" })}
            />
          </Specimen>
          <Specimen caption="md">
            <TextField
              size="md"
              label={t({ en: "Medium", zh: "中" })}
              placeholder={t({ en: "md", zh: "中" })}
            />
          </Specimen>
          <Specimen caption="lg">
            <TextField
              size="lg"
              label={t({ en: "Large", zh: "大" })}
              placeholder={t({ en: "lg", zh: "大" })}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Description", zh: "说明文字" })}>
        <Specimen caption="description">
          <div css={styles.single}>
            <TextField
              label={t({ en: "Display name", zh: "显示名称" })}
              defaultValue={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
              description={t({
                en: "Shown on your public profile and in reviews.",
                zh: "将显示在你的公开资料和评论中。",
              })}
            />
          </div>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Adornments", zh: "装饰图标" })}>
        <SpecimenGrid>
          <Specimen caption={t({ en: "leading unit", zh: "前置单位" })}>
            <TextField
              label={t({ en: "Amount", zh: "金额" })}
              inputMode="decimal"
              placeholder="0.00"
              leading="$"
            />
          </Specimen>
          <Specimen caption={t({ en: "trailing unit", zh: "后置单位" })}>
            <TextField
              label={t({ en: "Weight", zh: "重量" })}
              inputMode="decimal"
              placeholder="0"
              trailing="kg"
            />
          </Specimen>
          <Specimen caption={t({ en: "leading icon", zh: "前置图标" })}>
            <TextField
              label={t({ en: "Search", zh: "搜索" })}
              type="search"
              placeholder={t({ en: "Search movies", zh: "搜索电影" })}
              leading={<MagnifyingGlassIcon weight="bold" />}
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "States", zh: "状态" })}>
        <SpecimenGrid>
          <Specimen caption="required">
            <TextField
              required
              label={t({ en: "Full name", zh: "全名" })}
              placeholder={t({ en: "Required field", zh: "必填字段" })}
            />
          </Specimen>
          <Specimen caption="error">
            <TextField
              label={t({ en: "Email", zh: "电子邮箱" })}
              type="email"
              defaultValue="not-an-email"
              error={t({
                en: "Enter a valid email address.",
                zh: "请输入有效的电子邮箱地址。",
              })}
            />
          </Specimen>
          <Specimen caption="disabled">
            <TextField
              disabled
              label={t({ en: "Account ID", zh: "账户 ID" })}
              defaultValue="usr_8f3a21"
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

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
              en: "Helper text under the label, wired to the input via aria-describedby.",
              zh: "标签下方的说明文字，通过 aria-describedby 关联到输入框。",
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
            name: "leading",
            type: "ReactNode",
            description: t({
              en: "Decorative leading adornment (icon or unit), rendered aria-hidden.",
              zh: "前置装饰内容（图标或单位），以 aria-hidden 渲染。",
            }),
          },
          {
            name: "trailing",
            type: "ReactNode",
            description: t({
              en: "Decorative trailing adornment (icon or unit), rendered aria-hidden.",
              zh: "后置装饰内容（图标或单位），以 aria-hidden 渲染。",
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
              en: "StyleX overrides merged over the input — the escape hatch.",
              zh: "合并到输入框上的 StyleX 覆盖样式——逃生舱口。",
            }),
          },
          {
            name: "...native",
            type: 'Omit<ComponentProps<"input">, "size">',
            description: t({
              en: "Forwarded to the underlying input (type, placeholder, value, onChange, disabled, ref).",
              zh: "转发给底层 input（type、placeholder、value、onChange、disabled、ref）。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <div css={fill.inline}>
            <TextField
              label={t({ en: "Email", zh: "电子邮箱" })}
              type="email"
              placeholder="you@example.com"
            />
          </div>
        }
        doCaption={t({
          en: "Always pass a visible label; use the placeholder only for an example of the format.",
          zh: "始终提供可见标签；占位符仅用于示范格式。",
        })}
        dont={
          <div css={fill.inline}>
            <input
              css={[corner.radius_2, styles.rawInput]}
              placeholder={t({ en: "Email", zh: "电子邮箱" })}
              aria-label={t({ en: "Email", zh: "电子邮箱" })}
            />
          </div>
        }
        dontCaption={t({
          en: "Don't rely on the placeholder to name the field — it disappears on input and reads poorly to assistive tech.",
          zh: "不要用占位符来命名字段——输入后它会消失，且对辅助技术不友好。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  single: {
    inlineSize: "100%",
    maxInlineSize: "26rem",
  },
  rawInput: {
    inlineSize: "100%",
    fontFamily: font.family,
    fontSize: font.uiControl,
    color: color.textMain,
    backgroundColor: color.bgInteractiveRest,
    borderStyle: "solid",
    borderWidth: border.size_1,
    borderColor: color.neutralBorder,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
});
