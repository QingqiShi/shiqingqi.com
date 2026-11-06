import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

export function ColorNamesShowcase() {
  const parts = [
    { part: "bg", slot: t({ en: "Paints", zh: "绘制" }) },
    { part: "Control", slot: t({ en: "Element", zh: "元素" }) },
    { part: "Strong", slot: t({ en: "Variant, if any", zh: "变体，可省" }) },
    { part: "Selected", slot: t({ en: "State, if any", zh: "状态，可省" }) },
  ];

  return (
    <GuideSection
      title={t({
        en: "Name the element, and the token follows.",
        zh: "说出元素，令牌随之而定。",
      })}
      lead={t({
        en: "Every colour token in @tuja/ui/color.stylex reads in one order: what it paints (bg, fg, border), the element (Canvas, Surface, Control, an Intent), then any variant and state. Each holds a light and a dark value, so one style paints both themes.",
        zh: "@tuja/ui/color.stylex 中的每个颜色令牌都按同一顺序命名：绘制什么（bg、fg、border）、什么元素（Canvas、Surface、Control、意图色），再加上变体与状态。每个令牌都同时含有浅色与深色值，因此一份样式即可绘制两种主题。",
      })}
    >
      <figure css={[cardSurface.base, styles.card]}>
        <ol
          css={styles.parts}
          aria-label={parts.map(({ part }) => part).join("")}
        >
          {parts.map(({ part, slot }, index) => {
            const isAbove = index % 2 === 0;
            return (
              <li key={part} css={styles.part}>
                <span css={styles.word}>{part}</span>
                <span
                  aria-hidden
                  css={[
                    styles.bracket,
                    isAbove ? styles.bracketAbove : styles.bracketBelow,
                  ]}
                />
                <span
                  css={[
                    styles.label,
                    isAbove ? styles.labelAbove : styles.labelBelow,
                  ]}
                >
                  <span css={[typeRole.label, styles.slot]}>{slot}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </figure>
      <GuideNote>
        {t({
          en: "Text on a filled element takes fgOn and that element, such as fgOnControlStrong, not fg.",
          zh: "填充元素上的文字用 fgOn 加上该元素，例如 fgOnControlStrong，不用 fg。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "The page already paints bgCanvas and sets fg, so plain text needs no token.",
          zh: "页面已绘制 bgCanvas 并设置 fg，因此普通文字无需令牌。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  card: {
    containerType: "inline-size",
    margin: 0,
    paddingBlock: { default: space._8, [breakpoints.md]: space._9 },
    paddingInline: space._5,
  },
  parts: {
    display: "grid",
    gridTemplateColumns: "repeat(4, max-content)",
    gridTemplateRows: "repeat(5, auto)",
    justifyContent: "center",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  part: {
    display: "grid",
    gridTemplateRows: "subgrid",
    gridRow: "1 / -1",
  },
  word: {
    gridRow: "3",
    fontFamily: font.familyMono,
    fontSize: "min(1.5rem, 7cqi)",
    fontWeight: font.weight_4,
    lineHeight: font.lineHeight_3,
    color: color.fg,
    whiteSpace: "nowrap",
  },
  bracket: {
    blockSize: space._1,
    marginInline: rhythm.inline,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.fg,
  },
  bracketAbove: {
    gridRow: "2",
    marginBlockEnd: rhythm.inline,
    borderBlockEndWidth: 0,
  },
  bracketBelow: {
    gridRow: "4",
    marginBlockStart: rhythm.inline,
    borderBlockStartWidth: 0,
  },
  label: {
    display: "flex",
    justifyContent: "center",
    inlineSize: 0,
    minInlineSize: "100%",
  },
  labelAbove: {
    gridRow: "1",
    alignItems: "flex-end",
    paddingBlockEnd: rhythm.tight,
  },
  labelBelow: {
    gridRow: "5",
    alignItems: "flex-start",
    paddingBlockStart: rhythm.tight,
  },
  slot: {
    flexShrink: 0,
    maxInlineSize: "max(100%, 6em)",
    fontWeight: font.weight_5,
    color: color.fg,
    textAlign: "center",
    textWrap: "balance",
  },
});
