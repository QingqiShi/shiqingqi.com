import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

export function TextStylesShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Headings", zh: "标题" })}>
        <div css={[flex.col, styles.stack]}>
          <div css={[flex.col, styles.row]}>
            <Heading level={1} variant="display">
              {t({
                en: "Display headline for hero moments",
                zh: "用于关键瞬间的展示标题",
              })}
            </Heading>
            <span css={styles.token}>display</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Heading level={1} variant="h1">
              {t({ en: "Heading level one", zh: "一级标题" })}
            </Heading>
            <span css={styles.token}>h1</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Heading level={2} variant="h2">
              {t({ en: "Heading level two", zh: "二级标题" })}
            </Heading>
            <span css={styles.token}>h2</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Heading level={3} variant="h3">
              {t({ en: "Heading level three", zh: "三级标题" })}
            </Heading>
            <span css={styles.token}>h3</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Heading level={4} variant="h4">
              {t({ en: "Heading level four", zh: "四级标题" })}
            </Heading>
            <span css={styles.token}>h4</span>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Body & supporting", zh: "正文与辅助" })}>
        <div css={[flex.col, styles.stack]}>
          <div css={[flex.col, styles.row]}>
            <Text variant="body">
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </Text>
            <span css={styles.token}>body</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text variant="bodySmall">
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </Text>
            <span css={styles.token}>bodySmall</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text variant="caption">
              {t({
                en: "Caption text for image descriptions and footnotes.",
                zh: "用于图片说明与脚注的辅助文字。",
              })}
            </Text>
            <span css={styles.token}>caption</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text variant="overline">
              {t({ en: "Overline label", zh: "上线标签" })}
            </Text>
            <span css={styles.token}>overline</span>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Tones", zh: "色调" })}>
        <div css={[flex.col, styles.stack]}>
          <div css={[flex.col, styles.row]}>
            <Text tone="default">
              {t({
                en: "Default tone — primary content.",
                zh: "默认色调——主要内容。",
              })}
            </Text>
            <span css={styles.token}>default</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text tone="muted">
              {t({
                en: "Muted tone — secondary information.",
                zh: "弱化色调——次要信息。",
              })}
            </Text>
            <span css={styles.token}>muted</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text tone="subtle">
              {t({
                en: "Subtle tone — incidental notes.",
                zh: "微弱色调——附带备注。",
              })}
            </Text>
            <span css={styles.token}>subtle</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text tone="accent">
              {t({
                en: "Accent tone — highlighted phrases.",
                zh: "强调色调——突出语句。",
              })}
            </Text>
            <span css={styles.token}>accent</span>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Weights", zh: "字重" })}>
        <div css={[flex.col, styles.stack]}>
          <div css={[flex.col, styles.row]}>
            <Text weight="regular">
              {t({
                en: "Regular weight — comfortable reading default.",
                zh: "常规字重——舒适的阅读默认值。",
              })}
            </Text>
            <span css={styles.token}>regular</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text weight="medium">
              {t({
                en: "Medium weight — gentle emphasis.",
                zh: "中等字重——轻度强调。",
              })}
            </Text>
            <span css={styles.token}>medium</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text weight="semibold">
              {t({
                en: "Semibold weight — confident emphasis.",
                zh: "半粗字重——明确强调。",
              })}
            </Text>
            <span css={styles.token}>semibold</span>
          </div>
          <div css={[flex.col, styles.row]}>
            <Text weight="bold">
              {t({
                en: "Bold weight — strong emphasis.",
                zh: "粗体字重——强烈强调。",
              })}
            </Text>
            <span css={styles.token}>bold</span>
          </div>
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._4,
  },
  row: {
    gap: space._0,
    alignItems: "flex-start",
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
});
