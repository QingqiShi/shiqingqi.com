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
            en: "Five visual looks, from the hero display down to a body-size section label.",
            zh: "五种视觉字号，从主视觉 display 一直到正文大小的分区标签。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption="display · 3rem">
            <Heading level={1} look="display">
              {t({
                en: "Stories worth the night in",
                zh: "值得留家一晚的故事",
              })}
            </Heading>
          </Specimen>
          <Specimen caption="h1 · 1.5rem">
            <Heading level={1} look="h1">
              {t({ en: "Trending this week", zh: "本周趋势" })}
            </Heading>
          </Specimen>
          <Specimen caption="h2 · 1.25rem">
            <Heading level={2} look="h2">
              {t({ en: "Because you watched noir", zh: "因为你看过黑色电影" })}
            </Heading>
          </Specimen>
          <Specimen caption="h3 · 1.1rem">
            <Heading level={3} look="h3">
              {t({ en: "New this Friday", zh: "本周五上新" })}
            </Heading>
          </Specimen>
          <Specimen caption="h4 · 1rem">
            <Heading level={4} look="h4">
              {t({ en: "Continue watching", zh: "继续观看" })}
            </Heading>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Level vs look", zh: "层级与字号" })}>
        <ShowcaseHelper>
          {t({
            en: "level sets the semantic rank for the document outline; look sets the visual step. Decoupling lets an <h2> read as a display heading without breaking the outline.",
            zh: "level 决定文档大纲中的语义层级，look 决定外观。二者解耦，让 <h2> 能以 display 大小呈现而不破坏大纲。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption="<h2> · display">
            <Heading level={2} look="display">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen caption="<h3> · h1">
            <Heading level={3} look="h1">
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
            en: "weight overrides the weight the look sets, so a display heading can read light or extra-heavy without touching its size.",
            zh: "weight 会覆盖 look 设定的字重，因此 display 标题可以变轻或加重，而无需改动字号。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption='look="display" · regular'>
            <Heading level={2} look="display" weight="regular">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen
            caption={t({
              en: 'look="display" · bold (default)',
              zh: 'look="display" · bold（默认）',
            })}
          >
            <Heading level={2} look="display">
              {t({ en: "Featured this week", zh: "本周精选" })}
            </Heading>
          </Specimen>
          <Specimen caption='look="display" · black'>
            <Heading level={2} look="display" weight="black">
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
              <Heading level={3} look="h2">
                {t({
                  en: "The quiet triumph of a very patient thriller",
                  zh: "一部极有耐心的惊悚片的静默胜利",
                })}
              </Heading>
            </div>
          </Specimen>
          <Specimen caption='wrap="balance"'>
            <div css={styles.wrapStage}>
              <Heading level={3} look="h2" wrap="balance">
                {t({
                  en: "The quiet triumph of a very patient thriller",
                  zh: "一部极有耐心的惊悚片的静默胜利",
                })}
              </Heading>
            </div>
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="heading" />

      <DoDont
        do={
          <Heading level={2} look="display">
            {t({ en: "Featured this week", zh: "本周精选" })}
          </Heading>
        }
        doCaption={t({
          en: "Keep ranks in document order (h1 → h2 …), then pick any look for the size you want.",
          zh: "让层级遵循文档顺序（h1 → h2 …），再自由选择所需字号的 look。",
        })}
        dont={
          <Heading level={1} look="h4">
            {t({ en: "Featured this week", zh: "本周精选" })}
          </Heading>
        }
        dontCaption={t({
          en: "Don't add a second h1 or pick the level by how big you want the text — set level by rank, look by size.",
          zh: "不要新增第二个 h1，也不要按想要的字号来选层级——层级按等级定，字号按 look 定。",
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
