import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { Badge } from "@tuja/ui/components/badge";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase, ShowcaseGrid, ShowcaseItem } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function BadgeShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Variants", zh: "风格" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="default">
            <Badge variant="default">{t({ en: "Default", zh: "默认" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="info">
            <Badge variant="info">{t({ en: "Info", zh: "信息" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="success">
            <Badge variant="success">{t({ en: "Success", zh: "成功" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="warning">
            <Badge variant="warning">{t({ en: "Warning", zh: "警告" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="danger">
            <Badge variant="danger">{t({ en: "Danger", zh: "危险" })}</Badge>
          </ShowcaseItem>
          <ShowcaseItem label="accent">
            <Badge variant="accent">{t({ en: "Accent", zh: "强调" })}</Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="small">
            <Badge size="small" variant="accent">
              {t({ en: "Small", zh: "小" })}
            </Badge>
          </ShowcaseItem>
          <ShowcaseItem label="medium">
            <Badge size="medium" variant="accent">
              {t({ en: "Medium", zh: "中" })}
            </Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <ShowcaseGrid>
          <ShowcaseItem label="small">
            <Badge
              size="small"
              variant="success"
              icon={<CheckIcon weight="bold" />}
            >
              {t({ en: "Verified", zh: "已验证" })}
            </Badge>
          </ShowcaseItem>
          <ShowcaseItem label="medium">
            <Badge
              size="medium"
              variant="warning"
              icon={<StarIcon weight="fill" />}
            >
              {t({ en: "Featured", zh: "精选" })}
            </Badge>
          </ShowcaseItem>
        </ShowcaseGrid>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Badge } from "@tuja/ui/components/badge";

<Badge variant="success" icon={<CheckIcon weight="bold" />}>
  Verified
</Badge>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "Chip contents — usually a short label.",
                zh: "徽章内容——通常是简短的标签。",
              }),
            },
            {
              name: "variant",
              type: '"default" | "neutral" | "info" | "success" | "warning" | "danger" | "accent"',
              defaultValue: '"default"',
              description: t({
                en: "Colour treatment: bordered or borderless surfaces, or a semantic status hue.",
                zh: "颜色处理：带边框或无边框的表面，或语义化的状态色。",
              }),
            },
            {
              name: "size",
              type: '"small" | "medium"',
              defaultValue: '"medium"',
              description: t({
                en: "Padding and type scale.",
                zh: "内边距与字号。",
              }),
            },
            {
              name: "icon",
              type: "ReactNode",
              description: t({
                en: "Optional leading glyph, rendered decoratively (aria-hidden).",
                zh: "可选的前置图标，以装饰性方式渲染（aria-hidden）。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last, letting a caller win over the variant defaults.",
                zh: "最后合成的 StyleX 覆盖样式，使调用方可覆盖变体默认值。",
              }),
            },
            {
              name: "…span attributes",
              type: 'ComponentProps<"span">',
              description: t({
                en: "Native span attributes (id, onClick, data-*, className, style, ref) are forwarded.",
                zh: "原生 span 属性（id、onClick、data-*、className、style、ref）会被转发。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <>
              <Badge variant="success">
                {t({ en: "Active", zh: "进行中" })}
              </Badge>
              <Badge variant="neutral">{t({ en: "Draft", zh: "草稿" })}</Badge>
            </>
          }
          doCaption={t({
            en: "Use a badge for terse, at-a-glance status or metadata.",
            zh: "用徽章表示简洁、一目了然的状态或元信息。",
          })}
          dont={
            <>
              <Badge variant="accent">{t({ en: "All", zh: "全部" })}</Badge>
              <Badge variant="default">{t({ en: "Movies", zh: "电影" })}</Badge>
            </>
          }
          dontCaption={t({
            en: "Don't use badges as filters or toggles — reach for a Button or segmented control that's focusable and reports state.",
            zh: "不要把徽章当作筛选或开关——应使用可聚焦且能反馈状态的按钮或分段控件。",
          })}
        />
      </Showcase>
    </>
  );
}
