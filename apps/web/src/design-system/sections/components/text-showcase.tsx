import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { ThemeFramePair } from "#src/design-system/theme-frame.tsx";
import { t } from "#src/i18n.ts";

export function TextShowcase() {
  const runtimes = ["1:02", "12:45", "128:09"];

  return (
    <>
      <Showcase label={t({ en: "Looks", zh: "Look" })}>
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
          <Specimen caption="bodySmall · .85rem">
            <Text look="bodySmall">
              {t({
                en: "2h 08m · Crime, Drama · Directed by Ana Reyes",
                zh: "2小时08分 · 犯罪、剧情 · 导演 Ana Reyes",
              })}
            </Text>
          </Specimen>
          <Specimen caption="label · .85rem · 500">
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
          <Specimen caption="overline · .7rem">
            <Text look="overline">
              {t({ en: "Now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Tones", zh: "色调" })}>
        <ShowcaseHelper>
          {t({
            en: "Three tones that resolve per theme — never a hand-picked colour.",
            zh: "三种色调会随主题自动解析——无需手动挑选颜色。",
          })}
        </ShowcaseHelper>
        <ThemeFramePair>
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
            <Specimen caption="accent">
              <Text tone="accent">
                {t({
                  en: "Highlighted, on-brand phrases",
                  zh: "突出显示的品牌语句",
                })}
              </Text>
            </Specimen>
          </div>
        </ThemeFramePair>
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
              {t({ en: "Medium — gentle emphasis", zh: "中等——轻度强调" })}
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

      <Showcase label={t({ en: "Element", zh: "元素" })}>
        <ShowcaseHelper>
          {t({
            en: "as picks the semantic element; look picks the size. They stay decoupled, so a span can still read at body size inline. A p at body or bodySmall is a paragraph, so its lines stop at the Measure.",
            zh: "as 决定语义元素，look 决定字号，二者相互独立——因此 span 仍可在行内保持正文字号。body 或 bodySmall 字号的 p 是段落，所以每行到行长上限为止。",
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
      </Showcase>

      <Showcase label={t({ en: "Case transform", zh: "大小写转换" })}>
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

      <Showcase label={t({ en: "Wrapping", zh: "换行" })}>
        <div css={stack.item}>
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
          <Specimen caption='wrap="pretty"'>
            <div css={styles.wrapSpecimen}>
              <Text wrap="pretty">
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
            <div css={stack.tight}>
              {runtimes.map((runtime) => (
                <Text key={runtime} align="end">
                  {runtime}
                </Text>
              ))}
            </div>
          </Specimen>
          <Specimen caption="numeric">
            <div css={stack.tight}>
              {runtimes.map((runtime) => (
                <Text key={runtime} numeric align="end">
                  {runtime}
                </Text>
              ))}
            </div>
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="text" />

      <DoDont
        do={
          <Text look="caption" tone="muted">
            {t({ en: "Added 3 hours ago", zh: "3 小时前添加" })}
          </Text>
        }
        doCaption={t({
          en: "Pick a look and tone so the type role and theme own the size and colour.",
          zh: "选择 look 与 tone，让字体角色与主题掌控字号和颜色。",
        })}
        dont={
          <Text css={styles.hardCodedType}>
            {t({ en: "Added 3 hours ago", zh: "3 小时前添加" })}
          </Text>
        }
        dontCaption={t({
          en: "Hard-coded pixels and opacity skip the type roles and break dark-mode contrast.",
          zh: "硬编码像素与透明度会绕开字体角色，并破坏深色模式的对比度。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // The don't specimen: hard-coded pixels and opacity in place of the scale.
  hardCodedType: {
    // eslint-disable-next-line @tuja/require-type-role -- The "don't" specimen must show a raw size.
    fontSize: "11px",
    opacity: 0.5,
  },
  // Narrow enough that the line breaks land differently per mode, and clipped
  // so the nowrap specimen overflows its box instead of the page.
  wrapSpecimen: {
    inlineSize: "100%",
    maxInlineSize: "22rem",
    overflow: "hidden",
  },
});
