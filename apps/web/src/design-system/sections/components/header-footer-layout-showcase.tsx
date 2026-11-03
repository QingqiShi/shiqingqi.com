import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocale } from "@tuja/i18n/server-locale";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { HeaderFooterLayout } from "@tuja/ui/components/header-footer-layout";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { blurStage } from "#src/design-system/blur-stage.stylex.ts";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { BackButton } from "#src/site-shell/back-button.tsx";
import { LocaleSelector } from "#src/site-shell/locale-selector.tsx";
import { ThemeSwitch } from "#src/theme/theme-switch.tsx";
import { ShellChoice } from "./shell-choice.tsx";

/**
 * A small scrolling viewport. The fixed control groups of the shell are fixed
 * to the blur stage around it, so they stay pinned while the viewport scrolls.
 */
function ScrollStage({ children }: { children: ReactNode }) {
  return (
    <div css={blurStage.base}>
      <div css={[corner.radius_3, styles.frame]}>
        <div css={styles.viewport}>
          <EffectCarrier value="contained">{children}</EffectCarrier>
        </div>
      </div>
    </div>
  );
}

export function HeaderFooterLayoutShowcase() {
  const locale = getLocale();
  const backButton = (
    <BackButton locale={locale} label={t({ en: "Back", zh: "返回" })} />
  );
  const controls = (
    <>
      <ThemeSwitch
        labels={[
          t({ en: "Switch to light theme", zh: "切换至浅色模式" }),
          t({ en: "Switch to dark theme", zh: "切换至深色模式" }),
        ]}
      />
      <LocaleSelector
        ariaLabel={t({ en: "Select a language", zh: "选择语言" })}
        locale={locale}
      />
    </>
  );
  const wash = <div css={styles.specimenBackground} aria-hidden="true" />;
  const footer = (
    <footer>
      <Text as="p" look="caption" tone="muted">
        {t({
          en: "The footer, in the same column",
          zh: "页脚，在同一内容列中",
        })}
      </Text>
    </footer>
  );
  const article = (
    <article css={styles.article}>
      <Heading level={2}>
        {t({ en: "The quiet harbour", zh: "静谧的港湾" })}
      </Heading>
      <Text tone="muted">
        {t({
          en: "A reading page gets one centred measure and room to breathe. A back link on the left, utilities on the right, and nothing else competes with the text.",
          zh: "阅读页有一个居中的版心和充裕的留白。左侧是返回链接，右侧是实用控件，没有其他元素与正文争夺注意力。",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "The background runs edge to edge beneath the content. Each floating group takes the pointer only on its own controls, so text stays selectable up to the top edge.",
          zh: "背景在内容下方满幅延展。每组悬浮控件只在控件本身上接收指针，因此文字直到顶部边缘都可以选中。",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "The footer shares the column's width and gutters, so the page reads as one measure from headline to colophon.",
          zh: "页脚与内容列共享宽度和边距，从标题到版权信息整页保持同一版心。",
        })}
      </Text>
    </article>
  );

  return (
    <>
      <ShellChoice />

      <GuideSection
        title={t({
          en: "Float the controls, and let the page scroll under them.",
          zh: "让控件悬浮，页面从它们下方滚过。",
        })}
        lead={t({
          en: "Two floating groups hold the controls, and the footer ends the column. Once a full page leaves the top, it blurs around each group.",
          zh: "两组悬浮控件分居两侧，页脚位于内容列末尾。完整的页面一旦离开顶部，就会在每组控件周围虚化。",
        })}
      >
        <Specimen
          stage={ScrollStage}
          caption={t({
            en: "scroll it, and the controls stay pinned",
            zh: "滚动它，控件保持固定",
          })}
        >
          <HeaderFooterLayout
            as="div"
            pageColumn
            headerStart={backButton}
            headerEnd={controls}
            background={wash}
            footer={footer}
          >
            {article}
          </HeaderFooterLayout>
        </Specimen>
        <GuideNote>
          {t({
            en: "Put page decoration in background: it runs edge to edge beneath the content.",
            zh: "把页面装饰放进 background：它在内容下方满幅铺开。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The content flows up under the controls, so a text page adds its own space at the top.",
            zh: "内容向上延伸到控件之下，因此文字页要自行在顶部留出间距。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="header-footer-layout" />
    </>
  );
}

const styles = stylex.create({
  frame: {
    position: "relative",
    inlineSize: "100%",
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  // The scroller, so the groups can be watched staying pinned while the content
  // moves under them. It rounds its own clip to the frame's corners, which the
  // shell's full-bleed background layer would otherwise square off.
  viewport: {
    maxBlockSize: space._14,
    overflowY: "auto",
    overscrollBehavior: "contain",
    borderRadius: "inherit",
    cornerShape: "inherit",
  },
  // Stand-in for a page's decoration layer: a soft wash beneath the content.
  specimenBackground: {
    position: "absolute",
    insetInlineStart: 0,
    insetInlineEnd: 0,
    insetBlockStart: 0,
    blockSize: space._13,
    backgroundImage: `linear-gradient(${color.bgNeutralSubtle}, transparent)`,
  },
  article: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.item,
    maxInlineSize: measure.prose,
    // Text-first content clears the header controls itself; heroes bleed under
    // them.
    paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`,
  },
});
