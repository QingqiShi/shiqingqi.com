import * as stylex from "@stylexjs/stylex";
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
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { measure } from "#src/design-system/measure.stylex.ts";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { t } from "#src/i18n.ts";

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
          <Card css={[stack.tight, styles.fill]}>
            <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
            <span css={[typeRole.bodySmall, styles.body]}>{sampleBody}</span>
          </Card>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "可交互" })}>
        <Specimen caption="interactive">
          <Card interactive css={[stack.tight, styles.fill]}>
            <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
            <span css={[typeRole.bodySmall, styles.body]}>{sampleBody}</span>
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
            <span css={[typeRole.bodySmall, styles.body]}>{sampleBody}</span>
          </a>
        </Specimen>
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
        <Text look="bodySmall" tone="muted" css={styles.note}>
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

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
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
              <span css={[typeRole.bodySmall, styles.body]}>{sampleBody}</span>
            </a>
          }
          doCaption={t({
            en: "For a clickable card, render a real anchor or button and compose cardSurface — it stays focusable and is announced as a link.",
            zh: "可点击的卡片应渲染真实的链接或按钮并组合 cardSurface——它可获得焦点并被读屏识别为链接。",
          })}
          dont={
            <Card interactive css={[stack.tight, styles.fill]}>
              <span css={[typeRole.h3, styles.title]}>{sampleTitle}</span>
              <span css={[typeRole.bodySmall, styles.body]}>{sampleBody}</span>
            </Card>
          }
          dontCaption={t({
            en: "Don't use a bare interactive Card (a div) as a link — it isn't keyboard-focusable and screen readers won't announce it.",
            zh: "不要把可交互的 Card（一个 div）当作链接使用——它无法通过键盘聚焦，读屏软件也不会识别它。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  // The specimen stage sizes its child to its content, so a card that has to
  // span its container asks for the width.
  fill: {
    inlineSize: "100%",
  },
  link: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    padding: space._5,
    textDecoration: "none",
    inlineSize: "100%",
  },
  note: {
    maxInlineSize: measure.prose,
  },
  title: {
    color: color.fg,
  },
  body: {
    color: color.fgMuted,
  },
});
