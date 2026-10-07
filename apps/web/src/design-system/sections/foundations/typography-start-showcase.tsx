import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { RouteLinkCards } from "#src/design-system/guide/route-link-cards.tsx";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

const COMPONENT_LINKS: readonly { path: DesignSystemPath }[] = [
  { path: "/design-system/components/text" },
  { path: "/design-system/components/heading" },
];

/**
 * The opening section of the Typography page: copy goes through Text and
 * Heading, and the font tokens are for text you style yourself.
 */
export function TypographyStartShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Write copy with Text and Heading",
        zh: "用 Text 与 Heading 写文字",
      })}
      lead={t({
        en: "Text and Heading set the size, line height, weight and colour from the tokens. You choose a look for the size, and the callsite never names a font token.",
        zh: "Text 与 Heading 从令牌中设定字号、行高、字重与颜色。你只需为字号选一个 look，调用处无需写出任何字体令牌。",
      })}
    >
      <GuideList
        items={[
          {
            term: "Heading level · look",
            value: t({ en: "Rank and size, apart", zh: "层级与字号分开" }),
            note: t({
              en: 'level renders h1 to h6 for the document outline; look sets the size: display, h1, h2, h3 or h4. look follows level when you leave it out, and levels 4 to 6 all look like h4. A section title can be level={2} look="display".',
              zh: 'level 按文档大纲渲染 h1 到 h6；look 设定字号：display、h1、h2、h3 或 h4。省略 look 时它跟随 level，4 到 6 级都显示为 h4。区块标题可以写成 level={2} look="display"。',
            }),
          },
          {
            term: "Text look · as",
            value: '"body" · "bodySmall" · "caption" · "overline"',
            note: t({
              en: 'as picks p, span or div and leaves the size alone. overline is small uppercase with wide tracking and a semibold weight; transform="uppercase" gives the same case at any other look.',
              zh: 'as 选择 p、span 或 div，不影响字号。overline 是小号大写、字距宽、半粗；transform="uppercase" 可在其他任何 look 下得到同样的大写。',
            }),
          },
          {
            term: "weight · tone",
            value: t({ en: "Weight and colour", zh: "字重与颜色" }),
            note: t({
              en: "weight overrides the look's weight: regular, medium, semibold or bold, and on Heading also extrabold and black. tone is Text only: default, muted or accent.",
              zh: "weight 覆盖 look 自带的字重：regular、medium、semibold 或 bold，Heading 另有 extrabold 与 black。tone 只有 Text 有：default、muted 或 accent。",
            }),
          },
          {
            term: "wrap · numeric",
            value: t({ en: "Line breaks and figures", zh: "换行与数字" }),
            note: t({
              en: 'wrap="pretty" keeps a lone word off the last line of body copy; wrap="balance" evens the lines of a short title. numeric on Text sets tabular figures, so numbers line up in a column and a changing value does not shift.',
              zh: 'wrap="pretty" 避免正文末行只剩一个词；wrap="balance" 让短标题各行长度均衡。Text 上的 numeric 启用等宽数字，使数字在列中对齐，变化的数值也不会移位。',
            }),
          },
        ]}
      />
      <RouteLinkCards columns={2} links={COMPONENT_LINKS} />
      <UsageSnippet
        code={`import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";

<Heading level={2}>Watchlist</Heading>
<Text tone="muted" look="bodySmall">12 films, 3 not yet watched</Text>`}
      />
      <GuideNote>
        {t({
          en: "Reach for the font tokens only when you build a piece Text and Heading cannot express: a stat, a hero title, a label inside a control of your own. Then write each property from a token, as below, and pair them as the next sections show.",
          zh: "只有在构建 Text 与 Heading 无法表达的部分时，例如一个统计数字、一个主视觉标题或你自己控件里的标签，才需要字体令牌。届时每个属性都取自令牌，如下所示，并按后面几节的方式搭配。",
        })}
      </GuideNote>
      <UsageSnippet
        code={`import * as stylex from "@stylexjs/stylex";
import { font } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  stat: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
    fontVariantNumeric: "tabular-nums",
  },
});

<span css={styles.stat}>4.8</span>`}
      />
    </GuideSection>
  );
}
