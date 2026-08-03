import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";

export function TextStylesShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Headings", zh: "标题" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="display">
            <Heading level={1} variant="display">
              {t({
                en: "Display headline for hero moments",
                zh: "用于关键瞬间的展示标题",
              })}
            </Heading>
          </Specimen>
          <Specimen caption="h1">
            <Heading level={1} variant="h1">
              {t({ en: "Heading level one", zh: "一级标题" })}
            </Heading>
          </Specimen>
          <Specimen caption="h2">
            <Heading level={2} variant="h2">
              {t({ en: "Heading level two", zh: "二级标题" })}
            </Heading>
          </Specimen>
          <Specimen caption="h3">
            <Heading level={3} variant="h3">
              {t({ en: "Heading level three", zh: "三级标题" })}
            </Heading>
          </Specimen>
          <Specimen caption="h4">
            <Heading level={4} variant="h4">
              {t({ en: "Heading level four", zh: "四级标题" })}
            </Heading>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Body & supporting", zh: "正文与辅助" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="body">
            <Text variant="body">
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="bodySmall">
            <Text variant="bodySmall">
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="caption">
            <Text variant="caption">
              {t({
                en: "Caption text for image descriptions and footnotes.",
                zh: "用于图片说明与脚注的辅助文字。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="overline">
            <Text variant="overline">
              {t({ en: "Overline label", zh: "上线标签" })}
            </Text>
          </Specimen>
        </div>
        <ShowcaseHelper>
          {t({
            en: "How long a line of any of these may run is a page decision, not a type one — see the measure on the Layout foundation.",
            zh: "这些样式的每行能排多长，取决于页面而非字体样式——见“布局”基础页中的行长。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Tones", zh: "色调" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="default">
            <Text tone="default">
              {t({
                en: "Default tone — primary content.",
                zh: "默认色调——主要内容。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="muted">
            <Text tone="muted">
              {t({
                en: "Muted tone — secondary information.",
                zh: "弱化色调——次要信息。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="subtle">
            <Text tone="subtle">
              {t({
                en: "Subtle tone — incidental notes.",
                zh: "微弱色调——附带备注。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="accent">
            <Text tone="accent">
              {t({
                en: "Accent tone — highlighted phrases.",
                zh: "强调色调——突出语句。",
              })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Weights", zh: "字重" })}>
        <div css={[flex.col, styles.stack]}>
          <Specimen caption="regular">
            <Text weight="regular">
              {t({
                en: "Regular weight — comfortable reading default.",
                zh: "常规字重——舒适的阅读默认值。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="medium">
            <Text weight="medium">
              {t({
                en: "Medium weight — gentle emphasis.",
                zh: "中等字重——轻度强调。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="semibold">
            <Text weight="semibold">
              {t({
                en: "Semibold weight — confident emphasis.",
                zh: "半粗字重——明确强调。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="bold">
            <Text weight="bold">
              {t({
                en: "Bold weight — strong emphasis.",
                zh: "粗体字重——强烈强调。",
              })}
            </Text>
          </Specimen>
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._4,
  },
});
