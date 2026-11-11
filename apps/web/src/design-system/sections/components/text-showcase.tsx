import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";

export function TextShowcase() {
  const runtimes = ["1:02", "12:45", "128:09"];

  return (
    <>
      <Showcase label={t({ en: "Looks", zh: "Look" })} leadsWithText>
        <ShowcaseHelper>
          {t({
            en: "Five looks, each a type role that sets the size, line height, weight and tracking together. Pick the look by the job of the text, not by eyeballing a pixel size.",
            zh: "五种 look，每种都是一个字体角色，同时设定字号、行高、字重与字距。按文字的用途选择 look，而不是靠肉眼估算像素大小。",
          })}
        </ShowcaseHelper>
        <div css={stack.item}>
          <Specimen caption="body · 1rem">
            <Text look="body">
              {t({
                en: "A weary detective takes one last case that drags his own past back into the light.",
                zh: "一位疲惫的警探接下最后一桩案子，却让自己的过往重见天日。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="bodySmall · .875rem">
            <Text look="bodySmall">
              {t({
                en: "2h 08m · Crime, Drama · Directed by Ana Reyes",
                zh: "2小时08分 · 犯罪、剧情 · 导演 Ana Reyes",
              })}
            </Text>
          </Specimen>
          <Specimen caption="label · .875rem · 400">
            <Text look="label">
              {t({ en: "Original language", zh: "原始语言" })}
            </Text>
          </Specimen>
          <Specimen caption="caption · .75rem">
            <Text look="caption">
              {t({
                en: "Added to your list 3 hours ago",
                zh: "3 小时前加入你的清单",
              })}
            </Text>
          </Specimen>
          <Specimen caption="overline · .875rem">
            <Text look="overline">
              {t({ en: "Now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Tones", zh: "色调" })} leadsWithText>
        <ShowcaseHelper>
          {t({
            en: "Tones resolve per theme, never a hand-picked colour. Success, warning, destructive and info take the text colour of their Intent, so the words must say what the colour means too: destructive is for a line that says something went wrong, as a field says its error.",
            zh: "各色调随主题自动解析，无需手动挑选颜色。success、warning、destructive 与 info 使用各自意图的文字颜色，因此文字本身也要说明颜色的含义：destructive 用于说明出了问题的一行文字，与字段显示错误的方式一致。",
          })}
        </ShowcaseHelper>
        <div css={stack.item}>
          <Specimen caption="default">
            <Text tone="default">
              {t({ en: "Primary reading content", zh: "主要阅读内容" })}
            </Text>
          </Specimen>
          <Specimen caption="muted">
            <Text tone="muted">
              {t({
                en: "Secondary metadata and captions",
                zh: "次要信息与说明",
              })}
            </Text>
          </Specimen>
          <Specimen caption="primary">
            <Text tone="primary">
              {t({
                en: "Highlighted, on-brand phrases",
                zh: "突出显示的品牌语句",
              })}
            </Text>
          </Specimen>
          <Specimen caption="success">
            <Text tone="success">
              {t({ en: "+£1,240.00 received", zh: "已收到 +£1,240.00" })}
            </Text>
          </Specimen>
          <Specimen caption="warning">
            <Text tone="warning">
              {t({
                en: "Three transactions have no category.",
                zh: "有三笔交易还没有分类。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="destructive">
            <Text tone="destructive">
              {t({
                en: "That did not save. Try again.",
                zh: "没有保存成功，请重试。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="info">
            <Text tone="info">
              {t({
                en: "The bank syncs again at 9:00.",
                zh: "银行将于 9:00 再次同步。",
              })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Weights", zh: "字重" })}>
        <div css={stack.item}>
          <Specimen caption="regular">
            <Text weight="regular">
              {t({
                en: "Regular — comfortable default",
                zh: "常规——舒适的默认值",
              })}
            </Text>
          </Specimen>
          <Specimen caption="medium">
            <Text weight="medium">
              {t({
                en: "Medium — shows as regular until the typeface has a Medium face",
                zh: "中等——在字体有中等字重之前，显示为常规",
              })}
            </Text>
          </Specimen>
          <Specimen caption="semibold">
            <Text weight="semibold">
              {t({ en: "Semibold — confident emphasis", zh: "半粗——明确强调" })}
            </Text>
          </Specimen>
          <Specimen caption="bold">
            <Text weight="bold">
              {t({ en: "Bold — strong emphasis", zh: "粗体——强烈强调" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Element", zh: "元素" })} leadsWithText>
        <ShowcaseHelper>
          {t({
            en: 'as picks the semantic element; look picks the size. They stay decoupled, so a span can still read at body size inline. A p at body or bodySmall is a paragraph, so its lines stop at the Measure, unless it takes measure="none".',
            zh: 'as 决定语义元素，look 决定字号，二者相互独立——因此 span 仍可在行内保持正文字号。body 或 bodySmall 字号的 p 是段落，所以每行到行长上限为止，除非设置 measure="none"。',
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption='as="p"'>
            <Text as="p">{t({ en: "Paragraph block", zh: "段落块" })}</Text>
          </Specimen>
          <Specimen caption='as="span"'>
            <Text as="span">{t({ en: "Inline run", zh: "行内文本" })}</Text>
          </Specimen>
          <Specimen caption='as="div"'>
            <Text as="div">{t({ en: "Generic block", zh: "通用块" })}</Text>
          </Specimen>
        </SpecimenGrid>
        <Specimen caption='measure="none"'>
          <Text look="bodySmall" tone="muted" measure="none">
            {t({
              en: "A note in a card whose other lines already run the full width can run that wide too, so it does not stop short of the rows above and below it. Without the cap, its lines go on to the edge of the card, however wide the card is.",
              zh: "卡片中的说明，若周围的行已占满宽度，它也可以占满宽度，不会比上下的行提前停下。去掉上限后，无论卡片多宽，它的每一行都会一直延伸到卡片的边缘。",
            })}
          </Text>
        </Specimen>
      </Showcase>

      <Showcase
        label={t({ en: "Case transform", zh: "大小写转换" })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: "transform sets the letter case independently of look — e.g. an uppercase eyebrow at caption size.",
            zh: "transform 独立于 look 设定字母大小写——例如以 caption 字号呈现的大写眉标。",
          })}
        </ShowcaseHelper>
        <div css={stack.item}>
          <Specimen caption='transform="uppercase"'>
            <Text look="caption" transform="uppercase">
              {t({ en: "Now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
          <Specimen caption='transform="capitalize"'>
            <Text look="caption" transform="capitalize">
              {t({ en: "now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
          <Specimen caption='transform="lowercase"'>
            <Text look="caption" transform="lowercase">
              {t({ en: "NOW STREAMING", zh: "正在热播" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Alignment", zh: "对齐" })}>
        <div css={stack.item}>
          <Specimen caption='align="start"'>
            <Text align="start">
              {t({ en: "Aligned to start", zh: "起始对齐" })}
            </Text>
          </Specimen>
          <Specimen caption='align="center"'>
            <Text align="center">
              {t({ en: "Aligned to center", zh: "居中对齐" })}
            </Text>
          </Specimen>
          <Specimen caption='align="end"'>
            <Text align="end">
              {t({ en: "Aligned to end", zh: "末尾对齐" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Wrapping", zh: "换行" })} leadsWithText>
        <ShowcaseHelper>
          {t({
            en: 'A paragraph wraps "pretty" by default, so no word is left alone on its last line. "balance" evens every line, for short copy that stands alone, and "nowrap" keeps one line.',
            zh: '段落默认以 "pretty" 换行，末行不会只剩一个词。"balance" 让每行长度均衡，适合简短的独立文案；"nowrap" 保持单行。',
          })}
        </ShowcaseHelper>
        <div css={stack.item}>
          <Specimen caption="default">
            <div css={styles.wrapSpecimen}>
              <Text>
                {t({
                  en: "A tense, patient thriller that trusts its audience completely.",
                  zh: "一部紧张而耐心的惊悚片，全然信任它的观众。",
                })}
              </Text>
            </div>
          </Specimen>
          <Specimen caption='wrap="balance"'>
            <div css={styles.wrapSpecimen}>
              <Text wrap="balance">
                {t({
                  en: "A tense, patient thriller that trusts its audience completely.",
                  zh: "一部紧张而耐心的惊悚片，全然信任它的观众。",
                })}
              </Text>
            </div>
          </Specimen>
          <Specimen caption='wrap="nowrap"'>
            <div css={styles.wrapSpecimen}>
              <Text wrap="nowrap">
                {t({
                  en: "A tense, patient thriller that trusts its audience completely.",
                  zh: "一部紧张而耐心的惊悚片，全然信任它的观众。",
                })}
              </Text>
            </div>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Figures", zh: "数字" })}>
        <div css={cluster.item}>
          <Specimen caption="default">
            <div css={stack.text}>
              {runtimes.map((runtime) => (
                <Text key={runtime} align="end">
                  {runtime}
                </Text>
              ))}
            </div>
          </Specimen>
          <Specimen caption="numeric">
            <div css={stack.text}>
              {runtimes.map((runtime) => (
                <Text key={runtime} numeric align="end">
                  {runtime}
                </Text>
              ))}
            </div>
          </Specimen>
        </div>
      </Showcase>

      <Showcase
        label={t({
          en: "Show what a person wrote as they wrote it",
          zh: "按人写下的原样显示文字",
        })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: "Where text has no tracking, as in Chinese and in a field, the typeface draws a digit in brackets as a circled figure, an x between digits as a times sign and a hyphen before > as an arrow. verbatim keeps what a person or an agent wrote as it was written.",
            zh: "在没有字距的文字中，例如中文和输入框里，字体会把括号中的数字画成带圈数字，把数字之间的 x 画成乘号，把 > 前的连字符画成箭头。verbatim 让人或智能体写下的文字保持原样。",
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption="default">
            <Text>
              {t({
                en: "Step (1): cut 2x3 -> glue",
                zh: "第 (1) 步：裁 2x3 -> 粘",
              })}
            </Text>
          </Specimen>
          <Specimen caption="verbatim">
            <Text verbatim>
              {t({
                en: "Step (1): cut 2x3 -> glue",
                zh: "第 (1) 步：裁 2x3 -> 粘",
              })}
            </Text>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase
        label={t({
          en: "Cut long text after a set number of lines",
          zh: "在指定行数后截断长文字",
        })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: "lines shows at most that many lines and ends the last one with an ellipsis. The full text stays in the page for a screen reader.",
            zh: "lines 最多显示指定的行数，并在最后一行末尾加省略号。完整文字仍在页面中，供屏幕阅读器读取。",
          })}
        </ShowcaseHelper>
        <Specimen caption="lines={2}">
          <div css={styles.wrapSpecimen}>
            <Text look="bodySmall" tone="muted" lines={2}>
              {t({
                en: "A weary detective takes one last case that drags his own past back into the light, and the city he swore to protect turns out to have kept his secrets better than he did.",
                zh: "一位疲惫的警探接下最后一桩案子，却让自己的过往重见天日；而他发誓守护的城市，竟比他自己更好地守住了他的秘密。",
              })}
            </Text>
          </div>
        </Specimen>
      </Showcase>

      <PropsTable component="text" />
    </>
  );
}

const styles = stylex.create({
  // Narrow enough that the line breaks land differently per mode, and clipped
  // so the nowrap specimen overflows its box instead of the page.
  wrapSpecimen: {
    inlineSize: "100%",
    maxInlineSize: "22rem",
    overflow: "hidden",
  },
});
