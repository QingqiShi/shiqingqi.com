import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

export function LayoutSpaceGuide() {
  const scales = [
    {
      term: "space",
      value: t({
        en: "Around and between things",
        zh: "事物的周围与之间",
      }),
      note: t({
        en: "The padding of a surface, the gap in a stack, the margin between sections. Card, Popover, Callout, Section and the page shells all take these from space. It is in rem, so it grows when the reader sets a larger text size, and it does not change with the screen.",
        zh: "表面的内边距、堆叠里的间隙、区块之间的外边距。Card、Popover、Callout、Section 与页面骨架都从 space 取这些值。它以 rem 为单位，读者调大文字时它随之变大，但它不随屏幕变化。",
      }),
    },
    {
      term: "controlSize",
      value: t({ en: "Inside a control", zh: "控件的内部" }),
      note: t({
        en: "The height of a control, its padding, the gap between its icon and its label. Button, TextField, Select, Chip, Switch, Slider, Checkbox and SegmentedControl take these from controlSize. It is 20% larger below the md breakpoint.",
        zh: "控件的高度、内边距，以及图标与标签之间的间隙。Button、TextField、Select、Chip、Switch、Slider、Checkbox 与 SegmentedControl 都从 controlSize 取这些值。在 md 断点以下，它大 20%。",
      }),
    },
  ];

  const matches = [
    {
      term: "Card",
      value: t({
        en: "space._3 block · space._4 inline",
        zh: "块向 space._3 · 行向 space._4",
      }),
      note: t({
        en: "cardSurface carries no padding. Add this when you put it on your own element, so it matches a Card.",
        zh: "cardSurface 不带内边距。把它用在自己的元素上时加上这一组，就与 Card 一致。",
      }),
    },
    {
      term: t({ en: "Compact surfaces", zh: "紧凑的表面" }),
      value: t({
        en: "space._2 block · space._3 inline",
        zh: "块向 space._2 · 行向 space._3",
      }),
      note: t({
        en: "Popover content, a Callout, a table cell, and the trigger and panel of a Disclosure with the card look.",
        zh: "Popover 的内容、Callout、表格单元格，以及卡片外观的 Disclosure 的触发区与面板。",
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
        zh: "HeaderFooterLayout 阅读栏的行向内边距，以及 SidebarLayout 在 md 以下的行向内边距。在有刘海的手机上，安全区内缩让内容不被遮住。",
      }),
    },
    {
      term: "Section",
      value: t({
        en: "gap space._3 · space._5 above a divider",
        zh: "间隙 space._3 · 分隔线上方 space._5",
      }),
      note: t({
        en: "A Section puts space._3 between its heading and its content. With divided, it draws a border.size_1 rule above and pads space._5 below it.",
        zh: "Section 在标题与内容之间留 space._3。启用 divided 时，它在上方画一条 border.size_1 的分隔线，并在线下留 space._5。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({ en: "Space or controlSize", zh: "space 还是 controlSize" })}
        lead={t({
          en: "There are two scales of length. Use controlSize inside a control and space everywhere else. The components split them the same way, so a control you build lines up with theirs.",
          zh: "长度有两套阶梯。控件内部用 controlSize，其余地方都用 space。组件也是这样划分的，所以你自己搭建的控件能与它们对齐。",
        })}
      >
        <GuideList items={scales} />
        <Specimen
          caption={t({
            en: "The Card pads with space; the Button inside it is sized with controlSize",
            zh: "Card 用 space 留内边距；里面的 Button 用 controlSize 定尺寸",
          })}
        >
          <Card css={[flex.col, styles.card]}>
            <Text look="bodySmall" weight="semibold">
              {t({ en: "Watchlist", zh: "待看清单" })}
            </Text>
            <Text look="caption" tone="muted">
              {t({ en: "12 titles", zh: "12 部" })}
            </Text>
            <Button size="sm" css={styles.action}>
              {t({ en: "Open", zh: "打开" })}
            </Button>
          </Card>
        </Specimen>
        <UsageSnippet
          code={`import { controlSize, space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  // Around and between things: space.
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
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
    gap: space._0,
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  action: {
    alignSelf: "flex-start",
    marginBlockStart: space._2,
  },
});
