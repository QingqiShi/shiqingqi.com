import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

export function HeadingShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Visual scale", zh: "视觉字阶" })}>
        <ShowcaseHelper>
          {t({
            en: "Five visual variants, from the hero display down to a body-size section label.",
            zh: "五种视觉字号，从主视觉 display 一直到正文大小的分区标签。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption="display · 3rem">
            <Heading level={1} variant="display">
              {t({
                en: "Stories worth the night in",
                zh: "值得留家一晚的故事",
              })}
            </Heading>
          </Specimen>
          <Specimen caption="h1 · 1.5rem">
            <Heading level={1} variant="h1">
              {t({ en: "Trending this week", zh: "本周趋势" })}
            </Heading>
          </Specimen>
          <Specimen caption="h2 · 1.25rem">
            <Heading level={2} variant="h2">
              {t({ en: "Because you watched noir", zh: "因为你看过黑色电影" })}
            </Heading>
          </Specimen>
          <Specimen caption="h3 · 1.1rem">
            <Heading level={3} variant="h3">
              {t({ en: "New this Friday", zh: "本周五上新" })}
            </Heading>
          </Specimen>
          <Specimen caption="h4 · 1rem">
            <Heading level={4} variant="h4">
              {t({ en: "Continue watching", zh: "继续观看" })}
            </Heading>
          </Specimen>
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
          <Specimen caption="<h2> · display">
            <Heading level={2} variant="display">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen caption="<h3> · h1">
            <Heading level={3} variant="h1">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen
            caption={t({
              en: "<h2> · h2 (default)",
              zh: "<h2> · h2（默认）",
            })}
          >
            <Heading level={2}>
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Weight", zh: "字重" })}>
        <ShowcaseHelper>
          {t({
            en: "weight overrides the weight the variant sets, so a display heading can read light or extra-heavy without touching its size.",
            zh: "weight 会覆盖 variant 设定的字重，因此 display 标题可以变轻或加重，而无需改动字号。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption='variant="display" · regular'>
            <Heading level={2} variant="display" weight="regular">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen
            caption={t({
              en: 'variant="display" · bold (default)',
              zh: 'variant="display" · bold（默认）',
            })}
          >
            <Heading level={2} variant="display">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen caption='variant="display" · black'>
            <Heading level={2} variant="display" weight="black">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Alignment", zh: "对齐" })}>
        <div css={styles.ladder}>
          <Specimen caption='align="start"'>
            <Heading level={3} align="start">
              {t({ en: "Aligned to start", zh: "起始对齐" })}
            </Heading>
          </Specimen>
          <Specimen caption='align="center"'>
            <Heading level={3} align="center">
              {t({ en: "Aligned to center", zh: "居中对齐" })}
            </Heading>
          </Specimen>
          <Specimen caption='align="end"'>
            <Heading level={3} align="end">
              {t({ en: "Aligned to end", zh: "末尾对齐" })}
            </Heading>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Wrapping", zh: "换行" })}>
        <ShowcaseHelper>
          {t({
            en: "balance evens the lines so a two-line title doesn't leave one word stranded. The browser's line cap is no constraint at heading length, which is why this is the mode headings want.",
            zh: "balance 会让各行长度均衡，使两行的标题不会在第二行只剩一个词。在标题长度下浏览器的行数上限不构成限制，因此这正是标题需要的模式。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption="(default)">
            <div css={styles.wrapStage}>
              <Heading level={3} variant="h2">
                {t({
                  en: "The quiet triumph of a very patient thriller",
                  zh: "一部极有耐心的惊悚片的静默胜利",
                })}
              </Heading>
            </div>
          </Specimen>
          <Specimen caption='wrap="balance"'>
            <div css={styles.wrapStage}>
              <Heading level={3} variant="h2" wrap="balance">
                {t({
                  en: "The quiet triumph of a very patient thriller",
                  zh: "一部极有耐心的惊悚片的静默胜利",
                })}
              </Heading>
            </div>
          </Specimen>
        </div>
      </Showcase>

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
              en: "step matching level",
              zh: "与 level 匹配的字号",
            }),
            description: t({
              en: "Visual type step, decoupled from level so rank and size can differ.",
              zh: "视觉字号档位，与 level 解耦，使层级与字号可以不同。",
            }),
          },
          {
            name: "weight",
            type: '"regular" | "medium" | "semibold" | "bold" | "extrabold" | "black"',
            defaultValue: t({
              en: "weight matching variant",
              zh: "与 variant 匹配的字重",
            }),
            description: t({
              en: "Font weight, overriding the weight the variant sets so rank, size, and weight stay independent.",
              zh: "字重，覆盖 variant 设定的字重，使层级、字号与字重相互独立。",
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
            name: "wrap",
            type: '"balance" | "pretty" | "nowrap"',
            description: t({
              en: 'How lines break. "balance" is the one headings want — it evens the lines so a two-line title doesn\'t strand a word.',
              zh: '控制换行方式。"balance" 正是标题所需——它让各行长度均衡，使两行标题不会孤零零地留下一个词。',
            }),
          },
          {
            name: "id",
            type: "string",
            description: t({
              en: "Id applied to the rendered heading, so a region can name itself with aria-labelledby pointing at it.",
              zh: "应用到渲染标题上的 id，使某个区域可用 aria-labelledby 指向它来命名自身。",
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

const styles = stylex.create({
  ladder: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  // Narrow enough that the sample wraps to two lines, where balancing shows.
  wrapStage: {
    inlineSize: "100%",
    maxInlineSize: "22rem",
  },
});
