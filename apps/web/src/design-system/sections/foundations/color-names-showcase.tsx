import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

const FILLS = [
  { name: "muted", style: "muted" },
  { name: "accent", style: "accent" },
  { name: "secondary", style: "secondary" },
] as const;

export function ColorNamesShowcase() {
  const surfaces = [
    { name: "background", style: styles.background },
    { name: "card", style: [cardSurface.base, styles.surface] },
    { name: "popover", style: [popoverSurface.base, styles.surface] },
  ];

  return (
    <GuideSection
      title={t({
        en: "Name the element, and the token follows.",
        zh: "说出元素，令牌随之而定。",
      })}
      lead={t({
        en: "A token in @tuja/ui/color.stylex has the name of the thing it paints: background is the page, card a container, and popover what floats. On any of them, muted is a quiet region, accent the fill under the pointer, and secondary a neutral piece.",
        zh: "@tuja/ui/color.stylex 中的令牌以它所绘制的东西命名：background 是页面，card 是容器，popover 是浮层。在任何一种表面上，muted 是安静的区域，accent 是指针下的填充，secondary 是中性的小块。",
      })}
    >
      {/* Safari drops the list role from a list without markers. */}
      <ul role="list" css={styles.grid}>
        {surfaces.map((surface) => (
          <li key={surface.name} css={[stack.item, surface.style]}>
            <Text as="span" look="bodySmall" css={styles.token}>
              {surface.name}
            </Text>
            <span css={stack.tight}>
              {FILLS.map((fill) => (
                <span
                  key={fill.name}
                  css={[corner.radius_2, styles.fill, styles[fill.style]]}
                >
                  <Text as="span" look="bodySmall" css={styles.token}>
                    {fill.name}
                  </Text>
                  <Text as="span" look="bodySmall" tone="muted">
                    Aa
                  </Text>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <GuideNote>
        {t({
          en: "Text on a fill takes the name of the fill and Foreground, such as primaryForeground on primary.",
          zh: "填充上的文字用该填充的名字加 Foreground，例如 primary 上用 primaryForeground。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "muted, accent and secondary are opaque and have the same value. The three names let a theme give them different values, so choose by what the element is.",
          zh: "muted、accent 与 secondary 不透明，且取值相同。三个名字让主题可以给它们不同的值，所以按元素是什么来选。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "Each token holds a light and a dark value, so one style paints both themes.",
          zh: "每个令牌都同时含有浅色与深色值，因此一份样式即可绘制两种主题。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
    gap: rhythm.item,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  // The page paints `color.background` already, so this column has no fill.
  background: {
    padding: space._5,
  },
  surface: {
    padding: space._5,
  },
  token: {
    fontFamily: font.familyMono,
  },
  fill: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBlock: space._3,
    paddingInline: space._4,
  },
  muted: { backgroundColor: color.muted },
  accent: { backgroundColor: color.accent },
  secondary: { backgroundColor: color.secondary },
});
