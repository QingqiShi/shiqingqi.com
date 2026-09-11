import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import * as stylex from "@stylexjs/stylex";
import { Callout } from "@tuja/ui/components/callout";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { CalloutDismissSpecimen } from "./callout-specimens.tsx";

export function CalloutShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Intents", zh: "意图色" })}>
        <SpecimenGrid css={styles.calloutGrid}>
          <Specimen caption="info">
            <Callout intent="info" title={t({ en: "Heads up", zh: "请注意" })}>
              {t({
                en: "Your export keeps running in the background — we'll email you when it's ready.",
                zh: "导出将在后台继续运行——完成后我们会通过邮件通知你。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption="success">
            <Callout
              intent="success"
              title={t({ en: "Changes saved", zh: "更改已保存" })}
            >
              {t({
                en: "Your profile is live and visible to everyone.",
                zh: "你的资料已发布，所有人均可查看。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption="warning">
            <Callout
              intent="warning"
              title={t({ en: "Storage almost full", zh: "存储空间即将用满" })}
            >
              {t({
                en: "You're using 92% of your plan's space.",
                zh: "你已使用套餐 92% 的空间。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption="danger">
            <Callout
              intent="danger"
              title={t({ en: "Payment failed", zh: "付款失败" })}
            >
              {t({
                en: "We couldn't charge the card ending in 4242. Update it to keep your subscription.",
                zh: "无法向尾号 4242 的卡扣款。请更新卡片以保留订阅。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption="accent">
            <Callout
              intent="accent"
              title={t({ en: "New in 2.0", zh: "2.0 新功能" })}
            >
              {t({
                en: "Segmented button groups now support leading icons.",
                zh: "分段按钮组现已支持前置图标。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption="neutral">
            <Callout
              intent="neutral"
              title={t({ en: "Read-only workspace", zh: "只读工作区" })}
            >
              {t({
                en: "You have view access. Ask an owner for edit rights.",
                zh: "你拥有查看权限。如需编辑，请向所有者申请。",
              })}
            </Callout>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Body only", zh: "仅正文" })}>
        <Specimen caption={t({ en: "no title", zh: "无标题" })}>
          <Callout intent="info">
            {t({
              en: "Omit the title for a single, concise line — the icon and tint still carry the Intent.",
              zh: "省略标题即为单行简讯——图标与着色依旧传达意图色。",
            })}
          </Callout>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Icon", zh: "图标" })}>
        <div css={styles.stack}>
          <ShowcaseHelper>
            {t({
              en: "Override the built-in icon with any node, or pass icon={null} to drop it entirely.",
              zh: "可用任意节点覆盖内置图标，或传入 icon={null} 完全移除。",
            })}
          </ShowcaseHelper>
          <Specimen caption={t({ en: "custom icon", zh: "自定义图标" })}>
            <Callout intent="accent" icon={<MegaphoneIcon weight="fill" />}>
              {t({
                en: "Swap in a Phosphor icon when an intent's default icon isn't specific enough.",
                zh: "当意图色的默认图标不够贴切时，可换用 Phosphor 图标。",
              })}
            </Callout>
          </Specimen>
          <Specimen caption={t({ en: "no icon", zh: "无图标" })}>
            <Callout intent="neutral" icon={null}>
              {t({
                en: "Drop the icon for a dense, text-first note where an icon would only add noise.",
                zh: "在以文字为主的紧凑提示中移除图标，避免图标造成干扰。",
              })}
            </Callout>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Dismissible", zh: "可关闭" })}>
        <div css={styles.stack}>
          <ShowcaseHelper>
            {t({
              en: "Pair onDismiss with a required dismissLabel to add an accessible inline close button.",
              zh: "将 onDismiss 与必填的 dismissLabel 搭配，即可添加带无障碍名称的行内关闭按钮。",
            })}
          </ShowcaseHelper>
          <Specimen caption="onDismiss">
            <CalloutDismissSpecimen />
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="callout" />

      <DoDont
        do={
          <Callout
            intent="danger"
            title={t({ en: "Upload failed", zh: "上传失败" })}
          >
            {t({
              en: "The file is larger than 25 MB. Compress it and try again.",
              zh: "文件大于 25 MB。请压缩后重试。",
            })}
          </Callout>
        }
        doCaption={t({
          en: "Let the tinted background, border, and icon carry the Intent, and keep the body to a sentence.",
          zh: "让着色背景、边框与图标传达意图色，并将正文控制在一句话内。",
        })}
        dont={
          <div css={styles.dontBar}>
            <span css={[corner.radius_1, styles.dontBarStripe]} aria-hidden />
            <span>
              {t({
                en: "Upload failed — the file is too large.",
                zh: "上传失败——文件过大。",
              })}
            </span>
          </div>
        }
        dontCaption={t({
          en: "Don't add a leading coloured accent bar (DESIGN.md ban) or rely on hue alone to signal status.",
          zh: "不要添加前缘彩色装饰条（DESIGN.md 禁止），也不要仅靠色相传达状态。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // A callout needs more room than a specimen track gives it by default.
  calloutGrid: {
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  // Deliberate anti-pattern for the DoDont "don't" — a leading accent stripe.
  dontBar: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  dontBarStripe: {
    inlineSize: space._0,
    alignSelf: "stretch",
    minBlockSize: space._5,
    backgroundColor: color.danger,
  },
});
