import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

export function LayoutSpaceGuide() {
  const scales = [
    {
      term: "rhythm",
      value: t({ en: "Between things", zh: "事物之间" }),
      note: t({
        en: "The gap in a stack, the space between groups, the space between sections. Its five steps are named for how two things relate. It is in rem, and its section step grows at md.",
        zh: "堆叠里的间隙、组与组之间、区块与区块之间的间距。它的五级以两件事物之间的关系命名。它以rem为单位，其中section一级在md处变大。",
      }),
    },
    {
      term: "space",
      value: t({ en: "Around things", zh: "事物的周围" }),
      note: t({
        en: "The padding of a surface, an offset, a fixed size. Card, Popover, Callout, Section and the page shells all take their padding from space. It is in rem, so it grows when the reader sets a larger text size, and it does not change with the screen.",
        zh: "表面的内边距、偏移量、固定尺寸。Card、Popover、Callout、Section与页面骨架都从space取内边距。它以rem为单位，读者调大文字时它随之变大，但它不随屏幕变化。",
      }),
    },
    {
      term: "controlSize",
      value: t({ en: "Inside a control", zh: "控件的内部" }),
      note: t({
        en: "The height of a control, its padding, the gap between its icon and its label. Button, TextField, Select, Chip, Switch, Slider, Checkbox and SegmentedControl take these from controlSize. It is 20% larger below the md breakpoint.",
        zh: "控件的高度、内边距，以及图标与标签之间的间隙。Button、TextField、Select、Chip、Switch、Slider、Checkbox与SegmentedControl都从controlSize取这些值。在md断点以下，它大20%。",
      }),
    },
  ];

  const matches = [
    {
      term: "Card",
      value: "space._5",
      note: t({
        en: "cardSurface carries no padding. Add this when you put it on your own element, so it matches a Card.",
        zh: "cardSurface不带内边距。把它用在自己的元素上时加上这一组，就与Card一致。",
      }),
    },
    {
      term: t({ en: "Compact surfaces", zh: "紧凑的表面" }),
      value: t({
        en: "space._2 block · space._3 inline",
        zh: "块向space._2 · 行向space._3",
      }),
      note: t({
        en: "Popover content, a table cell, and the trigger and panel of a Disclosure with the card look.",
        zh: "Popover的内容、表格单元格，以及卡片外观的Disclosure的触发区与面板。",
      }),
    },
    {
      term: "Callout",
      value: t({
        en: "space._3 block · space._4 inline",
        zh: "块向space._3 · 行向space._4",
      }),
      note: t({
        en: "A Callout holds a title and its text, so it takes more padding than a compact surface.",
        zh: "Callout包含标题及其正文，因此它的内边距比紧凑的表面更大。",
      }),
    },
    {
      term: t({ en: "Page gutter", zh: "页面边距" }),
      value: t({
        en: "space._3 + the safe-area inset",
        zh: "space._3 + 安全区内缩",
      }),
      note: t({
        en: "The inline padding of HeaderFooterLayout's reading column, and of SidebarLayout below md. On a phone with a notch, the inset keeps content out from under it.",
        zh: "HeaderFooterLayout阅读栏的行向内边距，以及SidebarLayout在md以下的行向内边距。在有刘海的手机上，安全区内缩让内容不被遮住。",
      }),
    },
    {
      term: "Section",
      value: t({
        en: "rhythm.tight · rhythm.item · space._5 under a divider",
        zh: "rhythm.tight · rhythm.item · 分隔线下方space._5",
      }),
      note: t({
        en: "A Section binds its heading to its content at rhythm.tight, and stacks the blocks of its content rhythm.item apart. With divider, it draws a border.size_1 rule above and pads space._5 below it.",
        zh: "Section以rhythm.tight将标题与内容相连，内容中的各块之间相隔rhythm.item。启用divider时，它在上方画一条border.size_1的分隔线，并在线下留space._5。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({
          en: "rhythm, space or controlSize",
          zh: "rhythm、space还是controlSize",
        })}
        lead={t({
          en: "There are three scales of length. Use rhythm between things, controlSize inside a control, and space for the rest: padding, offsets and sizes. The components split them the same way, so what you build lines up with theirs.",
          zh: "长度有三套阶梯。事物之间用rhythm，控件内部用controlSize，其余的内边距、偏移量与尺寸用space。组件也是这样划分的，所以你搭建的东西能与它们对齐。",
        })}
      >
        <GuideList items={scales} />
        <Specimen
          caption={t({
            en: "The Card pads with space; the Button inside it is sized with controlSize",
            zh: "Card用space留内边距；里面的Button用controlSize定尺寸",
          })}
        >
          <Card css={styles.card}>
            <div css={stack.text}>
              <Text look="bodySmall" weight="semibold">
                {t({ en: "Watchlist", zh: "待看清单" })}
              </Text>
              <Text look="caption" tone="muted">
                {t({ en: "12 titles", zh: "12部" })}
              </Text>
            </div>
            <Button size="sm" css={styles.action}>
              {t({ en: "Open", zh: "打开" })}
            </Button>
          </Card>
        </Specimen>
        <UsageSnippet
          code={`import { controlSize, rhythm, space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  // Between things: rhythm. Around things: space.
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    paddingBlock: space._3,
    paddingInline: space._4,
  },
  // Inside a control: controlSize, the same steps as a md Button.
  control: {
    minBlockSize: controlSize._9,
    paddingInline: controlSize._3,
    gap: controlSize._2,
  },
});`}
        />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Match the components",
          zh: "与组件保持一致",
        })}
        lead={t({
          en: "When you build a surface next to the components, take the same steps they use. These are the ones a page meets most.",
          zh: "在组件旁边搭建表面时，取与它们相同的步长。下面是页面上最常遇到的几组。",
        })}
      >
        <GuideList items={matches} />
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  card: {
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  action: {
    alignSelf: "flex-start",
  },
});
