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
 * Heading, and text you style yourself composes a type role.
 */
export function TypographyStartShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Write copy with Text and Heading",
        zh: "用 Text 与 Heading 写文字",
      })}
      lead={t({
        en: "Each look of Text and Heading is a type role: it sets the size, line height, weight and tracking together, and the component sets the colour from the tokens. You choose a look, and the callsite never names a font token.",
        zh: "Text 与 Heading 的每个 look 都是一个字体角色：它同时设定字号、行高、字重与字距，组件再从令牌中设定颜色。你只需选一个 look，调用处无需写出任何字体令牌。",
      })}
    >
      <GuideList
        items={[
          {
            term: "Heading level · look",
            value: t({ en: "Rank and size, apart", zh: "层级与字号分开" }),
            note: t({
              en: 'level renders h1 to h6 for the document outline; look picks the type role: display, h1, h2, h3 or h4. look follows level when you leave it out, and levels 4 to 6 all look like h4. A section title can be level={2} look="display".',
              zh: 'level 按文档大纲渲染 h1 到 h6；look 选择字体角色：display、h1、h2、h3 或 h4。省略 look 时它跟随 level，4 到 6 级都显示为 h4。区块标题可以写成 level={2} look="display"。',
            }),
          },
          {
            term: "Text look · as",
            value: '"body" · "bodySmall" · "label" · "caption" · "overline"',
            note: t({
              en: 'as picks p, span or div and leaves the size alone. label is a short line that names something: a field, a group, a meta row. overline is small uppercase with wide tracking and a semibold weight; transform="uppercase" gives the same case at any other look.',
              zh: 'as 选择 p、span 或 div，不影响字号。label 是为某样东西命名的一行短文字：一个字段、一个分组、一行元信息。overline 是小号大写、字距宽、半粗；transform="uppercase" 可在其他任何 look 下得到同样的大写。',
            }),
          },
          {
            term: "weight · tone",
            value: t({ en: "Weight and colour", zh: "字重与颜色" }),
            note: t({
              en: "weight overrides the weight the type role sets: regular, medium, semibold or bold, and on Heading also extrabold and black. tone is Text only: default, muted or accent.",
              zh: "weight 覆盖字体角色设定的字重：regular、medium、semibold 或 bold，Heading 另有 extrabold 与 black。tone 只有 Text 有：default、muted 或 accent。",
            }),
          },
          {
            term: "wrap · numeric",
            value: t({ en: "Line breaks and figures", zh: "换行与数字" }),
            note: t({
              en: "Text inherits text-wrap: pretty from the root, which keeps a lone word off the last line, and a Heading, like every heading type role, balances its lines. Pass wrap only to break differently. numeric on Text sets tabular figures, so numbers line up in a column and a changing value does not shift.",
              zh: "Text 从根元素继承 text-wrap: pretty，避免末行只剩一个词；Heading 与每个标题字体角色一样，默认让各行长度均衡。只有需要不同的换行方式时才传入 wrap。Text 上的 numeric 启用等宽数字，使数字在列中对齐，变化的数值也不会移位。",
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
          en: "When you build a piece Text and Heading cannot express, such as a nav item, a stat or a label inside a control of your own, compose a type role from typeRole and never pick a size token. Put the type role first in the css array. The weight is the one property your own style changes, with a font.weight_* token. For figures that line up, add typeModifier.numeric.",
          zh: "当你构建 Text 与 Heading 无法表达的部分时，例如一个导航项、一个统计数字或你自己控件里的标签，请从 typeRole 中组合一个字体角色，不要挑选字号令牌。把字体角色放在 css 数组的第一位。字重是你自己的样式唯一要改的属性，用 font.weight_* 令牌来改。需要对齐的数字，再加上 typeModifier.numeric。",
        })}
      </GuideNote>
      <UsageSnippet
        code={`import * as stylex from "@stylexjs/stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  navItem: { color: color.fgMuted },
  navItemActive: { color: color.fg, fontWeight: font.weight_6 },
});

<a css={[typeRole.label, styles.navItem, isActive && styles.navItemActive]}>
  Watchlist
</a>
<span css={[typeRole.h1, typeModifier.numeric]}>4.8</span>`}
      />
    </GuideSection>
  );
}
