import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function HeadingShowcase() {
  const ramp = [
    {
      meta: "display · 3rem",
      node: (
        <Heading level={1} variant="display">
          {t({ en: "Stories worth the night in", zh: "值得留家一晚的故事" })}
        </Heading>
      ),
    },
    {
      meta: "h1 · 1.5rem",
      node: (
        <Heading level={1} variant="h1">
          {t({ en: "Trending this week", zh: "本周趋势" })}
        </Heading>
      ),
    },
    {
      meta: "h2 · 1.25rem",
      node: (
        <Heading level={2} variant="h2">
          {t({ en: "Because you watched noir", zh: "因为你看过黑色电影" })}
        </Heading>
      ),
    },
    {
      meta: "h3 · 1.1rem",
      node: (
        <Heading level={3} variant="h3">
          {t({ en: "New this Friday", zh: "本周五上新" })}
        </Heading>
      ),
    },
    {
      meta: "h4 · 1rem",
      node: (
        <Heading level={4} variant="h4">
          {t({ en: "Continue watching", zh: "继续观看" })}
        </Heading>
      ),
    },
  ];

  const decoupled = [
    {
      meta: "<h2> · display",
      node: (
        <Heading level={2} variant="display">
          {t({ en: "Featured this week", zh: "本周精选" })}
        </Heading>
      ),
    },
    {
      meta: "<h3> · h1",
      node: (
        <Heading level={3} variant="h1">
          {t({ en: "Featured this week", zh: "本周精选" })}
        </Heading>
      ),
    },
    {
      meta: t({ en: "<h2> · h2 (default)", zh: "<h2> · h2（默认）" }),
      node: (
        <Heading level={2}>
          {t({ en: "Featured this week", zh: "本周精选" })}
        </Heading>
      ),
    },
  ];

  const alignments = [
    {
      meta: 'align="start"',
      node: (
        <Heading level={3} align="start">
          {t({ en: "Aligned to start", zh: "起始对齐" })}
        </Heading>
      ),
    },
    {
      meta: 'align="center"',
      node: (
        <Heading level={3} align="center">
          {t({ en: "Aligned to center", zh: "居中对齐" })}
        </Heading>
      ),
    },
    {
      meta: 'align="end"',
      node: (
        <Heading level={3} align="end">
          {t({ en: "Aligned to end", zh: "末尾对齐" })}
        </Heading>
      ),
    },
  ];

  const usage = `import { Heading } from "@tuja/ui/components/heading";

// Semantic <h2>, display-scale look
<Heading level={2} variant="display">
  Featured this week
</Heading>`;

  return (
    <>
      <Showcase label={t({ en: "Visual ramp", zh: "视觉字阶" })}>
        <ShowcaseHelper>
          {t({
            en: "Five visual variants, from the hero display down to a body-size section label.",
            zh: "五种视觉字号，从主视觉 display 一直到正文大小的分区标签。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          {ramp.map((row) => (
            <SpecRow key={row.meta} meta={row.meta}>
              {row.node}
            </SpecRow>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Level vs variant", zh: "层级与字号" })}>
        <ShowcaseHelper>
          {t({
            en: "level sets the semantic rank for the document outline; variant sets the look. Decoupling lets an <h2> read as a display heading without breaking the outline.",
            zh: "level 决定文档大纲中的语义层级，variant 决定外观。二者解耦，让 <h2> 能以 display 大小呈现而不破坏大纲。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          {decoupled.map((row) => (
            <SpecRow key={row.meta} meta={row.meta}>
              {row.node}
            </SpecRow>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Alignment", zh: "对齐" })}>
        <div css={styles.ladder}>
          {alignments.map((row) => (
            <div key={row.meta} css={styles.alignRow}>
              <div css={styles.alignSpecimen}>{row.node}</div>
              <span css={styles.meta}>{row.meta}</span>
            </div>
          ))}
        </div>
      </Showcase>

      <UsageSnippet code={usage} />

      <PropsTable
        rows={[
          {
            name: "children",
            type: "ReactNode",
            required: true,
            description: t({
              en: "Heading content to render.",
              zh: "要渲染的标题内容。",
            }),
          },
          {
            name: "level",
            type: "1 | 2 | 3 | 4 | 5 | 6",
            defaultValue: "2",
            description: t({
              en: "Semantic heading rank; drives the rendered <h1>–<h6> element.",
              zh: "语义标题层级，决定渲染的 <h1>–<h6> 元素。",
            }),
          },
          {
            name: "variant",
            type: '"display" | "h1" | "h2" | "h3" | "h4"',
            defaultValue: t({
              en: "ramp matching level",
              zh: "与 level 匹配的字号",
            }),
            description: t({
              en: "Visual type ramp, decoupled from level so rank and size can differ.",
              zh: "视觉字号档位，与 level 解耦，使层级与字号可以不同。",
            }),
          },
          {
            name: "align",
            type: '"start" | "center" | "end"',
            description: t({
              en: "Logical text alignment.",
              zh: "逻辑文本对齐方式。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX overrides, composed last so a caller can win over the defaults.",
              zh: "StyleX 覆盖样式，最后合成，可覆盖默认值。",
            }),
          },
          {
            name: "className",
            type: "string",
            description: t({
              en: "Escape-hatch class applied to the rendered heading.",
              zh: "应用到渲染标题上的应急 class。",
            }),
          },
          {
            name: "style",
            type: "CSSProperties",
            description: t({
              en: "Inline style applied to the rendered heading.",
              zh: "应用到渲染标题上的内联样式。",
            }),
          },
          {
            name: "ref",
            type: "Ref<HTMLHeadingElement>",
            description: t({
              en: "Ref to the rendered heading element.",
              zh: "指向渲染标题元素的 ref。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <Heading level={2} variant="display">
            {t({ en: "Featured this week", zh: "本周精选" })}
          </Heading>
        }
        doCaption={t({
          en: "Keep ranks in document order (h1 → h2 …), then pick any variant for the size you want.",
          zh: "让层级遵循文档顺序（h1 → h2 …），再自由选择所需字号的 variant。",
        })}
        dont={
          <Heading level={1} variant="h4">
            {t({ en: "Featured this week", zh: "本周精选" })}
          </Heading>
        }
        dontCaption={t({
          en: "Don't add a second h1 or pick the level by how big you want the text — set level by rank, variant by size.",
          zh: "不要新增第二个 h1，也不要按想要的字号来选层级——层级按等级定，字号按 variant 定。",
        })}
      />
    </>
  );
}

function SpecRow({ meta, children }: { meta: string; children: ReactNode }) {
  return (
    <div css={styles.specRow}>
      <div css={styles.specimen}>{children}</div>
      <span css={styles.meta}>{meta}</span>
    </div>
  );
}

const styles = stylex.create({
  ladder: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  specRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._0,
    minInlineSize: 0,
  },
  specimen: {
    minInlineSize: 0,
  },
  alignRow: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    minInlineSize: 0,
  },
  alignSpecimen: {
    inlineSize: "100%",
    minInlineSize: 0,
  },
  meta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
});
