import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function CardShowcase() {
  const sampleTitle = t({ en: "Typography", zh: "排版" });
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

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Card } from "@tuja/ui/components/card";

// A static surface — a panel, an alert, a list item.
<Card role="alert">Heads up.</Card>

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
