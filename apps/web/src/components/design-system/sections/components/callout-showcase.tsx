import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import * as stylex from "@stylexjs/stylex";
import { Callout } from "@tuja/ui/components/callout";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { CalloutDismissDemo } from "./callout-dismiss-demo.tsx";

const usageCode = `import { Callout } from "@tuja/ui/components/callout";

<Callout variant="success" title="Saved">
  Your profile changes are live.
</Callout>`;

export function CalloutShowcase() {
  // Resolve every variant's copy once, in a fixed order, and never inside the
  // `.map()` below — t() must run in render scope, not a callback.
  const variants = [
    {
      variant: "info",
      title: t({ en: "Heads up", zh: "请注意" }),
      body: t({
        en: "Your export keeps running in the background — we'll email you when it's ready.",
        zh: "导出将在后台继续运行——完成后我们会通过邮件通知你。",
      }),
    },
    {
      variant: "success",
      title: t({ en: "Changes saved", zh: "更改已保存" }),
      body: t({
        en: "Your profile is live and visible to everyone.",
        zh: "你的资料已发布，所有人均可查看。",
      }),
    },
    {
      variant: "warning",
      title: t({ en: "Storage almost full", zh: "存储空间即将用满" }),
      body: t({
        en: "You're using 92% of your plan's space.",
        zh: "你已使用套餐 92% 的空间。",
      }),
    },
    {
      variant: "danger",
      title: t({ en: "Payment failed", zh: "付款失败" }),
      body: t({
        en: "We couldn't charge the card ending in 4242. Update it to keep your subscription.",
        zh: "无法向尾号 4242 的卡扣款。请更新卡片以保留订阅。",
      }),
    },
    {
      variant: "accent",
      title: t({ en: "New in 2.0", zh: "2.0 新功能" }),
      body: t({
        en: "Segmented button groups now support leading icons.",
        zh: "分段按钮组现已支持前置图标。",
      }),
    },
    {
      variant: "neutral",
      title: t({ en: "Read-only workspace", zh: "只读工作区" }),
      body: t({
        en: "You have view access. Ask an owner for edit rights.",
        zh: "你拥有查看权限。如需编辑，请向所有者申请。",
      }),
    },
  ] as const;

  const variantsLabel = t({ en: "Variants", zh: "风格" });
  const bodyOnlyLabel = t({ en: "Body only", zh: "仅正文" });
  const bodyOnlyText = t({
    en: "Omit the title for a single, concise line — the glyph and tint still carry the tone.",
    zh: "省略标题即为单行简讯——字形与色调依旧传达语义。",
  });
  const iconLabel = t({ en: "Icon", zh: "图标" });
  const iconHelper = t({
    en: "Override the built-in glyph with any node, or pass icon={null} to drop it entirely.",
    zh: "可用任意节点覆盖内置字形，或传入 icon={null} 完全移除。",
  });
  const customIconCaption = t({ en: "custom icon", zh: "自定义图标" });
  const noIconCaption = t({ en: "no icon", zh: "无图标" });
  const dismissLabel = t({ en: "Dismissible", zh: "可关闭" });
  const dismissHelper = t({
    en: "Pair onDismiss with a required dismissLabel to add an accessible inline close button.",
    zh: "将 onDismiss 与必填的 dismissLabel 搭配，即可添加带无障碍名称的行内关闭按钮。",
  });

  return (
    <>
      <Showcase label={variantsLabel}>
        <div css={styles.calloutGrid}>
          {variants.map((entry) => (
            <Callout
              key={entry.variant}
              variant={entry.variant}
              title={entry.title}
            >
              {entry.body}
            </Callout>
          ))}
        </div>
      </Showcase>

      <Showcase label={bodyOnlyLabel}>
        <Callout variant="info">{bodyOnlyText}</Callout>
      </Showcase>

      <Showcase label={iconLabel}>
        <div css={styles.stack}>
          <ShowcaseHelper>{iconHelper}</ShowcaseHelper>
          <Callout
            variant="accent"
            title={customIconCaption}
            icon={<MegaphoneIcon weight="fill" />}
          >
            {t({
              en: "Swap in a Phosphor icon when a variant's default glyph isn't specific enough.",
              zh: "当变体的默认字形不够贴切时，可换用 Phosphor 图标。",
            })}
          </Callout>
          <Callout variant="neutral" title={noIconCaption} icon={null}>
            {t({
              en: "Drop the glyph for a dense, text-first note where an icon would only add noise.",
              zh: "在以文字为主的紧凑提示中移除字形，避免图标造成干扰。",
            })}
          </Callout>
        </div>
      </Showcase>

      <Showcase label={dismissLabel}>
        <div css={styles.stack}>
          <ShowcaseHelper>{dismissHelper}</ShowcaseHelper>
          <CalloutDismissDemo />
        </div>
      </Showcase>

      <UsageSnippet code={usageCode} />

      <PropsTable
        rows={[
          {
            name: "variant",
            type: '"info" | "success" | "warning" | "danger" | "accent" | "neutral"',
            defaultValue: '"info"',
            description: t({
              en: "Colour treatment and default glyph — maps to the semantic tint, border, and text token.",
              zh: "颜色处理与默认字形——映射到语义色调、边框与文本令牌。",
            }),
          },
          {
            name: "title",
            type: "ReactNode",
            description: t({
              en: "Optional bold heading above the body. Omit for a single-line message.",
              zh: "正文上方的可选加粗标题。省略即为单行消息。",
            }),
          },
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Body content. Keep it short — a callout is a summary, not a paragraph.",
              zh: "正文内容。保持简短——提示框是摘要，而非段落。",
            }),
          },
          {
            name: "icon",
            type: "ReactNode",
            description: t({
              en: "Leading glyph override. Defaults to the variant glyph; pass null to drop it. Always decorative.",
              zh: "前置字形覆盖。默认使用变体字形；传入 null 可移除。始终为装饰性。",
            }),
          },
          {
            name: "role",
            type: '"status" | "alert"',
            description: t({
              en: 'ARIA live role. Defaults to "alert" for danger/warning and "status" otherwise; pass to override.',
              zh: "提示框的 ARIA live 角色。danger/warning 默认为 “alert”，其余为 “status”；可传入以覆盖。",
            }),
          },
          {
            name: "onDismiss",
            type: "() => void",
            description: t({
              en: "Renders an inline close button; requires dismissLabel when set.",
              zh: "渲染行内关闭按钮；设置时必须提供 dismissLabel。",
            }),
          },
          {
            name: "dismissLabel",
            type: "string",
            description: t({
              en: "Accessible name for the close button — required whenever onDismiss is set.",
              zh: "关闭按钮的无障碍名称——设置 onDismiss 时必填。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX overrides, composed last so a caller can win over the defaults.",
              zh: "StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。",
            }),
          },
          {
            name: "...rest",
            type: 'ComponentProps<"div">',
            description: t({
              en: "Native div attributes (id, data-*, className, style, ref) are forwarded for escape-hatch composition.",
              zh: "原生 div 属性（id、data-*、className、style、ref）会被转发，用于逃生舱式组合。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <Callout
            variant="danger"
            title={t({ en: "Upload failed", zh: "上传失败" })}
          >
            {t({
              en: "The file is larger than 25 MB. Compress it and try again.",
              zh: "文件大于 25 MB。请压缩后重试。",
            })}
          </Callout>
        }
        doCaption={t({
          en: "Let the tinted background, border, and glyph carry the tone, and keep the body to a sentence.",
          zh: "让色调背景、边框与字形传达语义，并将正文控制在一句话内。",
        })}
        dont={
          <div css={styles.dontBar}>
            <span css={styles.dontBarStripe} aria-hidden />
            <span>
              {t({
                en: "Upload failed — the file is too large.",
                zh: "上传失败——文件过大。",
              })}
            </span>
          </div>
        }
        dontCaption={t({
          en: "Don't add a leading colored accent bar (DESIGN.md ban) or rely on hue alone to signal status.",
          zh: "不要添加前缘彩色装饰条（DESIGN.md 禁止），也不要仅靠色相传达状态。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  calloutGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 20rem), 1fr))",
    gap: space._3,
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
    borderRadius: border.radius_1,
    backgroundColor: color.danger,
  },
});
