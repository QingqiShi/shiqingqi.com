import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

export function ColorNamesShowcase() {
  const parts = [
    {
      part: "bg",
      span: placement.bg,
      slot: t({ en: "Paints", zh: "绘制" }),
      others: t({ en: "or fg, border", zh: "或 fg、border" }),
    },
    {
      part: "Control",
      span: placement.control,
      slot: t({ en: "Element", zh: "元素" }),
      others: t({
        en: "or Canvas, Surface, an Intent",
        zh: "或 Canvas、Surface、意图色",
      }),
    },
    {
      part: "Strong",
      span: placement.strong,
      slot: t({ en: "Variant, if any", zh: "变体，可省" }),
      others: t({ en: "or Subtle, Sunken", zh: "或 Subtle、Sunken" }),
    },
    {
      part: "Selected",
      span: placement.selected,
      slot: t({ en: "State, if any", zh: "状态，可省" }),
      others: t({
        en: "or Hover, Pressed, Disabled",
        zh: "或 Hover、Pressed、Disabled",
      }),
    },
  ];

  return (
    <GuideSection
      title={t({
        en: "Name the element, and the token follows.",
        zh: "说出元素，令牌随之而定。",
      })}
      lead={t({
        en: "Every colour token in @tuja/ui/tokens.stylex reads in one order: what it paints, the element, then any variant and state. Each holds a light and a dark value, so one style paints both themes.",
        zh: "@tuja/ui/tokens.stylex 中的每个颜色令牌都按同一顺序命名：绘制什么、什么元素，再加上变体与状态。每个令牌都同时含有浅色与深色值，因此一份样式即可绘制两种主题。",
      })}
    >
      <div css={styles.container}>
        <ol
          css={styles.parts}
          aria-label={parts.map(({ part }) => part).join("")}
        >
          {parts.map(({ part, span, slot, others }, index) => {
            const isAbove = index % 2 === 0;
            return (
              <li key={part} css={[styles.part, span]}>
                <span css={[typeRole.fluidH1, styles.word]}>{part}</span>
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
                  <span css={[typeRole.bodySmall, styles.slot]}>{slot}</span>
                  <span css={[typeRole.bodySmall, styles.others]}>
                    {others}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
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
  container: {
    containerType: "inline-size",
  },
  parts: {
    display: "grid",
    gridTemplateColumns: "repeat(4, max-content) minmax(0, 1fr)",
    gridTemplateRows: "repeat(5, auto)",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  part: {
    display: "grid",
    gridTemplateColumns: "subgrid",
    gridTemplateRows: "subgrid",
    gridRow: "1 / -1",
  },
  word: {
    gridColumn: "1",
    gridRow: "3",
    fontFamily: font.familyMono,
    fontSize: "min(2.5rem, 7cqi)",
    color: color.fg,
    whiteSpace: "nowrap",
  },
  bracket: {
    gridColumn: "1",
    blockSize: space._1,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.fgMuted,
  },
  bracketAbove: {
    gridRow: "2",
    marginBlockEnd: rhythm.tight,
    borderBlockEndWidth: 0,
  },
  bracketBelow: {
    gridRow: "4",
    marginBlockStart: rhythm.tight,
    borderBlockStartWidth: 0,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gridColumn: "1 / -1",
    contain: "inline-size",
    paddingInlineEnd: rhythm.item,
  },
  labelAbove: {
    gridRow: "1",
    alignSelf: "end",
    paddingBlockEnd: rhythm.tight,
  },
  labelBelow: {
    gridRow: "5",
    paddingBlockStart: rhythm.tight,
  },
  slot: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  others: {
    wordBreak: "keep-all",
    color: color.fgMuted,
  },
});

const placement = stylex.create({
  bg: { gridColumn: "1 / 3" },
  control: { gridColumn: "2 / 4" },
  strong: { gridColumn: "3 / -1" },
  selected: { gridColumn: "4 / -1" },
});
