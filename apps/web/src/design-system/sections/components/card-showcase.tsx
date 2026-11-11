import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@tuja/ui/components/card";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function CardShowcase() {
  const sampleTitle = t({ en: "Typography", zh: "文字设计" });
  const sampleBody = t({
    en: "Families, the type scale, weights, and heading and body styles.",
    zh: "字体、字号阶梯、字重，以及标题与正文样式。",
  });

  return (
    <>
      <Showcase label={t({ en: "Surface", zh: "表面" })}>
        <Specimen caption={t({ en: "static", zh: "静态" })}>
          <Card css={[fill.inline, styles.lines]}>
            <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
            <Text as="span" look="bodySmall" tone="muted">
              {sampleBody}
            </Text>
          </Card>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "可交互" })}>
        <Specimen caption="interactive">
          <Card interactive css={[fill.inline, styles.lines]}>
            <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
            <Text as="span" look="bodySmall" tone="muted">
              {sampleBody}
            </Text>
          </Card>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "As a link", zh: "作为链接" })}>
        {/* The whole card is clickable, so it renders a real anchor and composes
            the same surface. This is the pattern the design-system overview grid
            uses for its Next.js <Link> tiles. */}
        <Specimen caption="cardSurface">
          <a
            href="#card"
            css={[
              transition.colors,
              cardSurface.base,
              cardSurface.interactive,
              styles.link,
            ]}
          >
            <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
            <Text as="span" look="bodySmall" tone="muted">
              {sampleBody}
            </Text>
          </a>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Destructive", zh: "破坏性" })}>
        <Specimen caption='intent="destructive"'>
          <Card intent="destructive" css={fill.inline}>
            <CardHeader>
              <CardTitle>
                {t({ en: "Delete this account", zh: "删除此账户" })}
              </CardTitle>
              <CardDescription>
                {t({
                  en: "Its transactions and balances go too. This cannot be undone.",
                  zh: "其交易与余额也会一并删除。此操作无法撤销。",
                })}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button size="sm" look="destructive">
                {t({ en: "Delete account", zh: "删除账户" })}
              </Button>
            </CardFooter>
          </Card>
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'intent="destructive" draws the edge in the destructive colour, for a card of actions that cannot be undone. A colour alone does not say it, so the title says it too.',
            zh: 'intent="destructive" 以 destructive 色绘制卡片边缘，用于包含无法撤销操作的卡片。颜色本身无法表达危险，因此标题也要说明。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Slots", zh: "插槽" })}>
        <Specimen caption={t({ en: "every slot", zh: "全部插槽" })}>
          <Card>
            <CardHeader
              action={
                <Badge intent="success">
                  {t({ en: "Released", zh: "已上映" })}
                </Badge>
              }
            >
              <CardTitle>{sampleTitle}</CardTitle>
              <CardDescription>{sampleBody}</CardDescription>
            </CardHeader>
            <CardContent>
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "Card is a stack, so it puts an item gap between its blocks. The blocks set no margin of their own: a bare element that composes cardSurface sets its own gap, with a stack.",
                  zh: "Card 本身是一个堆叠，会在各区块之间留出 item 间距。区块自身不设外边距：仅组合 cardSurface 的裸元素需用 stack 自行设置间距。",
                })}
              </Text>
            </CardContent>
            <CardFooter>
              <Button size="sm">{t({ en: "Watch", zh: "观看" })}</Button>
              <Button size="sm" look="ghost">
                {t({ en: "Save", zh: "收藏" })}
              </Button>
            </CardFooter>
          </Card>
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "CardTitle renders a real heading — its visual size is fixed while level moves the rank, so a card stays reachable by heading navigation without distorting the outline.",
            zh: "CardTitle 渲染为真实的标题元素——视觉字号固定，由 level 调整层级，因此卡片既可通过标题导航访问，又不会破坏文档大纲。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="card" />
      <PropsTable component="card-header" />
      <PropsTable component="card-title" />
      <PropsTable component="card-description" />
      <PropsTable component="card-content" />
      <PropsTable component="card-footer" />
    </>
  );
}

const styles = stylex.create({
  // Card puts a gap between its blocks. The title and the text are lines of
  // one item, so they take no gap.
  lines: {
    gap: 0,
  },
  title: {
    color: color.foreground,
  },
  link: {
    display: "flex",
    flexDirection: "column",
    padding: space._5,
    textDecoration: "none",
    inlineSize: "100%",
  },
});
