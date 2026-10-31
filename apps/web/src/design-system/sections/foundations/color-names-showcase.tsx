import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

export function ColorNamesShowcase() {
  const parts = [
    {
      part: "bg",
      slot: t({ en: "What it paints", zh: "绘制什么" }),
      options: t({
        en: "bg, fg, fgOn or border",
        zh: "bg、fg、fgOn 或 border",
      }),
    },
    {
      part: "Control",
      slot: t({ en: "What the box is", zh: "盒子是什么" }),
      options: t({
        en: "Such as Canvas, Surface, Control or an Intent",
        zh: "例如 Canvas、Surface、Control 或意图色",
      }),
    },
    {
      part: "Strong",
      slot: t({ en: "Variant", zh: "变体" }),
      options: t({
        en: "Such as Strong, Bright, Sunken or Subtle",
        zh: "例如 Strong、Bright、Sunken 或 Subtle",
      }),
    },
    {
      part: "Selected",
      slot: t({ en: "State", zh: "状态" }),
      options: t({
        en: "Hover, Pressed, Selected or Disabled",
        zh: "Hover、Pressed、Selected 或 Disabled",
      }),
    },
  ];
  const name = parts.map(({ part }) => part).join("");

  return (
    <GuideSection
      title={t({
        en: "Name the box, and the token follows.",
        zh: "先认清盒子，令牌随之而定。",
      })}
      lead={t({
        en: "Every colour token in @tuja/ui/tokens.stylex reads in one order: what it paints, what the box is, then any variant and state. Each is a light-dark() value, so one style paints both themes.",
        zh: "@tuja/ui/tokens.stylex 中的每个颜色令牌都按同一顺序命名：绘制什么、盒子是什么，再加上变体与状态。每个令牌都是一个 light-dark() 值，因此一份样式即可绘制两种主题。",
      })}
    >
      <div css={[stack.item, styles.container]}>
        <p css={[typeRole.h2, styles.mono, styles.name]}>{name}</p>
        <ol
          css={[stack.tight, styles.parts]}
          aria-label={t({
            en: "The parts of bgControlStrongSelected",
            zh: "bgControlStrongSelected 的组成部分",
          })}
        >
          {parts.map(({ part, slot, options }, index) => (
            <li key={part} css={styles.row}>
              <span css={[typeRole.h2, styles.mono, styles.part]}>
                {/* The parts before this one hold its place under the name. */}
                <span aria-hidden css={styles.spacer}>
                  {parts
                    .slice(0, index)
                    .map((before) => before.part)
                    .join("")}
                </span>
                {part}
              </span>
              <span css={[typeRole.bodySmall, styles.label]}>
                <span css={styles.slot}>{slot}</span> {options}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <GuideNote>
        {t({
          en: "root.html paints bgCanvas and root.body sets fg, so most text needs no token.",
          zh: "root.html 绘制 bgCanvas，root.body 设置 fg，因此大多数文字无需令牌。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "Text on a Strong or Bright control takes its fgOn token, not fg.",
          zh: "Strong 或 Bright 控件上的文字用它的 fgOn 令牌，不用 fg。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  container: {
    containerType: "inline-size",
  },
  mono: {
    fontFamily: font.familyMono,
  },
  name: {
    margin: 0,
    color: color.fg,
  },
  parts: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: rhythm.item,
  },
  part: {
    color: color.fg,
    whiteSpace: "nowrap",
  },
  spacer: {
    visibility: "hidden",
  },
  label: {
    flex: {
      default: "1 1 100%",
      "@container (min-width: 38rem)": "1 1 14rem",
    },
    color: color.fgMuted,
  },
  slot: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
});
