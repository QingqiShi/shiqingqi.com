import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { ThemeFramePair } from "../../theme-frame.tsx";

export function TextShowcase() {
  const runtimes = ["1:02", "12:45", "128:09"];

  return (
    <>
      <Showcase label={t({ en: "Type scale", zh: "字号" })}>
        <ShowcaseHelper>
          {t({
            en: "One scale of four steps. Pick the step by role, not by eyeballing a pixel size.",
            zh: "四档字号构成的一套字阶。按用途选择档位，而不是靠肉眼估算像素大小。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption="body · 1rem">
            <Text variant="body">
              {t({
                en: "A weary detective takes one last case that drags his own past back into the light.",
                zh: "一位疲惫的警探接下最后一桩案子，却让自己的过往重见天日。",
              })}
            </Text>
          </Specimen>
          <Specimen caption="bodySmall · .85rem">
            <Text variant="bodySmall">
              {t({
                en: "2h 08m · Crime, Drama · Directed by Ana Reyes",
                zh: "2小时08分 · 犯罪、剧情 · 导演 Ana Reyes",
              })}
            </Text>
          </Specimen>
          <Specimen caption="caption · .75rem">
            <Text variant="caption">
              {t({
                en: "Added to your list 3 hours ago",
                zh: "3 小时前加入你的清单",
              })}
            </Text>
          </Specimen>
          <Specimen caption="overline · .7rem">
            <Text variant="overline">
              {t({ en: "Now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Tones", zh: "色调" })}>
        <ShowcaseHelper>
          {t({
            en: "Four foreground roles that resolve per theme — never a hand-picked colour.",
            zh: "四种前景色角色会随主题自动解析——无需手动挑选颜色。",
          })}
        </ShowcaseHelper>
        <ThemeFramePair>
          <div css={styles.ladder}>
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
            <Specimen caption="subtle">
              <Text tone="subtle">
                {t({
                  en: "Incidental footnotes and hints",
                  zh: "附带的脚注与提示",
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
        <div css={styles.ladder}>
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
            en: "as picks the semantic element; variant picks the size. They stay decoupled, so a span can still read at body size inline.",
            zh: "as 决定语义元素，variant 决定字号，二者相互独立——因此 span 仍可在行内保持正文字号。",
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
            en: "transform sets the letter case independently of variant — e.g. an uppercase eyebrow at caption size.",
            zh: "transform 独立于 variant 设定字母大小写——例如以 caption 字号呈现的大写眉标。",
          })}
        </ShowcaseHelper>
        <div css={styles.ladder}>
          <Specimen caption='transform="uppercase"'>
            <Text variant="caption" transform="uppercase">
              {t({ en: "Now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
          <Specimen caption='transform="capitalize"'>
            <Text variant="caption" transform="capitalize">
              {t({ en: "now streaming", zh: "正在热播" })}
            </Text>
          </Specimen>
          <Specimen caption='transform="lowercase"'>
            <Text variant="caption" transform="lowercase">
              {t({ en: "NOW STREAMING", zh: "正在热播" })}
            </Text>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Alignment", zh: "对齐" })}>
        <div css={styles.ladder}>
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
        <div css={styles.ladder}>
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
        <div css={styles.figureRow}>
          <Specimen caption="default">
            <div css={styles.figureColumn}>
              {runtimes.map((runtime) => (
                <Text key={runtime} align="end">
                  {runtime}
                </Text>
              ))}
            </div>
          </Specimen>
          <Specimen caption="numeric">
            <div css={styles.figureColumn}>
              {runtimes.map((runtime) => (
                <Text key={runtime} numeric align="end">
                  {runtime}
                </Text>
              ))}
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
              en: "Text content to render.",
              zh: "要渲染的文本内容。",
            }),
          },
          {
            name: "as",
            type: '"p" | "span" | "div"',
            defaultValue: '"p"',
            description: t({
              en: "Semantic element to render, decoupled from the visual variant.",
              zh: "要渲染的语义元素，与视觉字号相互独立。",
            }),
          },
          {
            name: "variant",
            type: '"body" | "bodySmall" | "caption" | "overline"',
            defaultValue: '"body"',
            description: t({
              en: "Type-scale step that sets font size, line height, and (for overline) tracking.",
              zh: "字阶档位，决定字号、行高，并为 overline 设置字距。",
            }),
          },
          {
            name: "tone",
            type: '"default" | "muted" | "subtle" | "accent"',
            defaultValue: '"default"',
            description: t({
              en: "Foreground colour role, resolved per theme.",
              zh: "前景色角色，随主题解析。",
            }),
          },
          {
            name: "weight",
            type: '"regular" | "medium" | "semibold" | "bold"',
            defaultValue: t({
              en: "overline → semibold",
              zh: "overline → 半粗",
            }),
            description: t({
              en: "Font weight. Unset overline defaults to semibold; other variants inherit the base weight.",
              zh: "字重。未设置时 overline 默认半粗，其余字号沿用基础字重。",
            }),
          },
          {
            name: "transform",
            type: '"uppercase" | "lowercase" | "capitalize"',
            description: t({
              en: "Letter case, decoupled from variant — e.g. an uppercase eyebrow at caption size.",
              zh: "字母大小写，与 variant 解耦——例如以 caption 字号呈现的大写眉标。",
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
              en: 'How lines break. "pretty" is the one for body copy — it avoids a one-word last line. "balance" evens every line, which suits short standalone copy but the browser caps it at a few lines.',
              zh: '控制换行方式。"pretty" 适用于正文——可避免最后一行只剩一个词。"balance" 会让每行长度均衡，适合简短独立文案，但浏览器只对少数几行生效。',
            }),
          },
          {
            name: "numeric",
            type: "boolean",
            description: t({
              en: "Renders figures at a fixed width so numbers line up in a column and a ticking value doesn't jitter.",
              zh: "以等宽方式渲染数字，使数字在列中对齐，跳动的数值也不会抖动。",
            }),
          },
          {
            name: "id",
            type: "string",
            description: t({
              en: "Id applied to the rendered element, so another node can point aria-labelledby or aria-describedby here.",
              zh: "应用到渲染元素上的 id，使其他节点可用 aria-labelledby 或 aria-describedby 指向它。",
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
              en: "Escape-hatch class applied to the rendered element.",
              zh: "应用到渲染元素上的应急 class。",
            }),
          },
          {
            name: "style",
            type: "CSSProperties",
            description: t({
              en: "Inline style applied to the rendered element.",
              zh: "应用到渲染元素上的内联样式。",
            }),
          },
          {
            name: "ref",
            type: "Ref<HTMLElement>",
            description: t({
              en: "Ref to the rendered <p>, <span>, or <div>.",
              zh: "指向渲染的 <p>、<span> 或 <div> 元素的 ref。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <Text variant="caption" tone="muted">
            {t({ en: "Added 3 hours ago", zh: "3 小时前添加" })}
          </Text>
        }
        doCaption={t({
          en: "Pick a variant and tone so the type scale and theme own the size and colour.",
          zh: "选择 variant 与 tone，让字阶与主题掌控字号和颜色。",
        })}
        dont={
          <Text css={styles.hardCodedType}>
            {t({ en: "Added 3 hours ago", zh: "3 小时前添加" })}
          </Text>
        }
        dontCaption={t({
          en: "Hard-coded pixels and opacity ignore the scale and break dark-mode contrast.",
          zh: "硬编码像素与透明度会脱离字阶，并破坏深色模式的对比度。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // The don't specimen: hard-coded pixels and opacity in place of the scale.
  hardCodedType: {
    fontSize: "11px",
    opacity: 0.5,
  },
  ladder: {
    display: "flex",
    flexDirection: "column",
    gap: space._4,
  },
  // Narrow enough that the line breaks land differently per mode, and clipped
  // so the nowrap specimen overflows its box instead of the page.
  wrapSpecimen: {
    inlineSize: "100%",
    maxInlineSize: "22rem",
    overflow: "hidden",
  },
  figureRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._7,
  },
  figureColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
});
