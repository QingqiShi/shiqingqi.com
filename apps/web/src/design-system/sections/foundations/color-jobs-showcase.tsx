import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { ThemeFramePair } from "#src/design-system/theme-frame.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

/**
 * The opening section of the Colour page: how a token name says its job, the
 * import, and one panel drawn from that code in both schemes.
 */
export function ColorJobsShowcase() {
  return (
    <GuideSection
      title={t({ en: "Read a token by its name", zh: "从名称读懂令牌" })}
      lead={t({
        en: "When you build your own element, every colour comes from the color group in @tuja/ui/tokens.stylex. A token's name says the property it paints, then its Token Role: what the box is. Decide what the box is — the canvas, a surface, a control, or an Intent — and the name follows.",
        zh: "自行构建元素时，所有颜色都来自 @tuja/ui/tokens.stylex 中的 color 组。令牌名称先说它绘制的属性，再说它的令牌角色，也就是这个盒子是什么。先确定盒子是什么——画布、表面、控件，还是某种意图色——名称随之而定。",
      })}
    >
      <GuideList
        items={[
          {
            term: "bg…",
            value: t({ en: "What fills a box", zh: "填充盒子的颜色" }),
            note: t({
              en: "bgCanvas, bgSurface, bgControl, bgAccent and the rest. The subject after bg says what the box is.",
              zh: "bgCanvas、bgSurface、bgControl、bgAccent 等。bg 之后的部分说明这个盒子是什么。",
            }),
          },
          {
            term: "fg…",
            value: t({
              en: "Text and icons drawn on it",
              zh: "画在其上的文字与图标",
            }),
            note: t({
              en: "fg and fgMuted on canvas, surface and control. fgOn<X> is the foreground for bg<X>, wherever bg<X> needs one of its own.",
              zh: "画布、表面与控件上用 fg 与 fgMuted。fgOn<X> 是 bg<X> 的前景色，用于需要专属前景色的 bg<X>。",
            }),
          },
          {
            term: "border…",
            value: t({ en: "Its edge", zh: "它的边缘" }),
            note: t({
              en: "border is the quiet default. border<Intent> is an Intent's edge, in the same tone as its fill.",
              zh: "border 是安静的默认边框。border<Intent> 是意图色的边缘，与其填充同一色调。",
            }),
          },
          {
            term: "…Hover, …Subtle",
            value: t({ en: "A state or a variant", zh: "状态或变体" }),
            note: t({
              en: "A suffix names a state — Hover, Pressed, Selected, Disabled — or a variant: Subtle for an Intent's tint, Sunken and Raised for a surface's elevation. No suffix is the rest state.",
              zh: "后缀表示一种状态——Hover、Pressed、Selected、Disabled——或一种变体：Subtle 是意图色的淡色，Sunken 与 Raised 是表面的高低层次。没有后缀即为静止状态。",
            }),
          },
        ]}
      />
      <UsageSnippet
        code={`import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  panel: {
    padding: space._4,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  title: { color: color.fg },
  meta: { color: color.fgMuted },
});

<section css={[corner.radius_3, styles.panel]}>
  <p css={styles.title}>Arrival</p>
  <p css={styles.meta}>2016 · 116 min</p>
  <Button look="primary">Add to watchlist</Button>
</section>`}
      />
      <ThemeFramePair>
        <section css={[corner.radius_3, stack.item, styles.panel]}>
          <div css={stack.tight}>
            <p css={[styles.line, styles.title]}>Arrival</p>
            <p css={[styles.line, styles.meta]}>2016 · 116 min</p>
          </div>
          <div css={styles.action}>
            <Button look="primary">
              {t({ en: "Add to watchlist", zh: "加入片单" })}
            </Button>
          </div>
        </section>
      </ThemeFramePair>
      <GuideNote>
        {t({
          en: "The same code paints both frames. Every colour token is one light-dark() value, so the colour-scheme on the element picks the value and there is no dark stylesheet to write. How to set the scheme on the root, or pin it on one subtree, is on ",
          zh: "两个画框出自同一段代码。每个颜色令牌都是一个 light-dark() 值，由元素上的 color-scheme 决定取哪一个，因此无需另写深色样式表。如何在根元素上设置配色方案、或在某个子树上固定它，见",
        })}
        <DocLink path="/design-system/foundations/get-started" />
        {t({ en: ".", zh: "。" })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  panel: {
    padding: space._4,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  line: {
    margin: 0,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
  },
  title: {
    color: color.fg,
    fontWeight: font.weight_7,
  },
  meta: {
    color: color.fgMuted,
    fontSize: font.uiBodySmall,
  },
  action: {
    display: "flex",
  },
});
