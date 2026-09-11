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

      <PropsTable component="text-field" />

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
