import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function CardShowcase() {
  const sampleTitle = t({ en: "Typography", zh: "文字设计" });
  const sampleBody = t({
    en: "Families, the type scale, weights, and heading and body styles.",
    zh: "字体、字号阶梯、字重，以及标题与正文样式。",
  });

  return (
    <>
      <Showcase label={t({ en: "Surface", zh: "表面" })}>
        <Card css={styles.stack}>
          <span css={styles.title}>{sampleTitle}</span>
          <span css={styles.body}>{sampleBody}</span>
        </Card>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "可交互" })}>
        <Card interactive css={styles.stack}>
          <span css={styles.title}>{sampleTitle}</span>
          <span css={styles.body}>{sampleBody}</span>
        </Card>
      </Showcase>

      <Showcase label={t({ en: "As a link", zh: "作为链接" })}>
        {/* The whole card is clickable, so it renders a real anchor and composes
            the same surface. This is the pattern the design-system overview grid
            uses for its Next.js <Link> tiles. */}
        <a
          href="#card"
          css={[
            transition.colors,
            cardSurface.base,
            cardSurface.interactive,
            styles.link,
          ]}
        >
          <span css={styles.title}>{sampleTitle}</span>
          <span css={styles.body}>{sampleBody}</span>
        </a>
      </Showcase>

      <Showcase label={t({ en: "Slots", zh: "插槽" })}>
        <Card>
          <CardHeader
            action={
              <Badge variant="success">
                {t({ en: "Released", zh: "已上映" })}
              </Badge>
            }
          >
            <CardTitle>{sampleTitle}</CardTitle>
            <CardDescription>{sampleBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Each block spaces itself off the one before it rather than relying on a gap from the parent, so the slots keep their rhythm inside a plain Card or a bare element composing cardSurface. The spacing is vertical: lay the slots out in a row and you set the gap yourself.",
                zh: "每个区块都会与前一个区块自行拉开间距，而不依赖父元素的 gap，因此这些插槽在普通卡片或仅组合 cardSurface 的裸元素中都能保持节奏。该间距为纵向：若要横向排列插槽，需自行设置 gap。",
              })}
            </Text>
          </CardContent>
          <CardFooter>
            <Button size="sm">{t({ en: "Watch", zh: "观看" })}</Button>
            <Button size="sm" variant="ghost">
              {t({ en: "Save", zh: "收藏" })}
            </Button>
          </CardFooter>
        </Card>
        <Text variant="bodySmall" tone="muted" css={styles.note}>
          {t({
            en: "CardTitle renders a real heading — its visual size is fixed while level moves the rank, so a card stays reachable by heading navigation without distorting the outline.",
            zh: "CardTitle 渲染为真实的标题元素——视觉字号固定，由 level 调整层级，因此卡片既可通过标题导航访问，又不会破坏文档大纲。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Card } from "@tuja/ui/components/card";

// A static surface — a panel, an alert, a list item.
<Card role="alert">Heads up.</Card>

// With the slots, for a card that has a title block and actions.
import {
  CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@tuja/ui/components/card";

<Card>
  <CardHeader action={<Badge variant="success">Released</Badge>}>
    <CardTitle>Typography</CardTitle>
    <CardDescription>Families, the type scale, weights.</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button size="sm">Watch</Button></CardFooter>
</Card>

// When the whole card is clickable, render a real anchor or button and
// compose the surface from the escape-hatch styles.
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";

<Link
  href={href}
  css={[transition.colors, cardSurface.base, cardSurface.interactive]}
>
  …
</Link>`}
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
                en: "Card contents.",
                zh: "卡片内容。",
              }),
            },
            {
              name: "interactive",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Adds a hover border and background lift plus an eased transition, for a card that is itself clickable.",
                zh: "添加悬停描边、背景抬升与缓动过渡，适用于本身可点击的卡片。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX overrides composed last — including the padding, so a denser or roomier card is a one-liner.",
                zh: "最后合成的 StyleX 覆盖样式——包括内边距，因此更紧凑或更宽松的卡片只需一行。",
              }),
            },
            {
              name: "…div attributes",
              type: 'ComponentProps<"div">',
              description: t({
                en: "Native div attributes (role, id, onClick, data-*, className, style, ref) are forwarded.",
                zh: "原生 div 属性（role、id、onClick、data-*、className、style、ref）会被转发。",
              }),
            },
            {
              name: "CardHeader",
              type: '{ action?: ReactNode } & ComponentProps<"div">',
              description: t({
                en: "The title block: a tight stack for the title and its description, plus an optional action top-aligned at the trailing edge.",
                zh: "标题区块：标题与描述的紧凑堆叠，外加可选的、顶部对齐于尾部的操作元素。",
              }),
            },
            {
              name: "CardTitle",
              type: "{ level?: 2 | 3 | 4 | 5 | 6, id?: string }",
              defaultValue: "level: 3",
              description: t({
                en: "The card's title as a real heading. Visual size stays fixed while level moves the rank. Give it an id and the Card can name itself with aria-labelledby.",
                zh: "以真实标题元素渲染的卡片标题。视觉字号固定，由 level 调整层级。为其设置 id，卡片即可用 aria-labelledby 命名自身。",
              }),
            },
            {
              name: "CardDescription",
              type: "{ children: ReactNode, id?: string }",
              description: t({
                en: "Supporting copy beneath the title, at the muted small-body step.",
                zh: "标题下方的补充文案，采用弱化的小号正文样式。",
              }),
            },
            {
              name: "CardContent",
              type: 'ComponentProps<"div">',
              description: t({
                en: "The main content region.",
                zh: "主要内容区域。",
              }),
            },
            {
              name: "CardFooter",
              type: 'ComponentProps<"div">',
              description: t({
                en: "A trailing row for the card's actions.",
                zh: "位于末尾、承载卡片操作的一行。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <a
              href="#card"
              css={[
                transition.colors,
                cardSurface.base,
                cardSurface.interactive,
                styles.link,
              ]}
            >
              <span css={styles.title}>{sampleTitle}</span>
              <span css={styles.body}>{sampleBody}</span>
            </a>
          }
          doCaption={t({
            en: "For a clickable card, render a real anchor or button and compose cardSurface — it stays focusable and is announced as a link.",
            zh: "可点击的卡片应渲染真实的链接或按钮并组合 cardSurface——它可获得焦点并被读屏识别为链接。",
          })}
          dont={
            <Card interactive css={styles.stack}>
              <span css={styles.title}>{sampleTitle}</span>
              <span css={styles.body}>{sampleBody}</span>
            </Card>
          }
          dontCaption={t({
            en: "Don't use a bare interactive Card (a div) as a link — it isn't keyboard-focusable and screen readers won't announce it.",
            zh: "不要把可交互的 Card（一个 div）当作链接使用——它无法通过键盘聚焦，读屏软件也不会识别它。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._3,
    paddingInline: space._4,
    textDecoration: "none",
  },
  note: {
    maxInlineSize: "65ch",
  },
  title: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    color: color.textMain,
  },
  body: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
  },
});
