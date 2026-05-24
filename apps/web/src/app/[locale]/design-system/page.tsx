import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { ViewTransition } from "react";
import { SectionNav } from "#src/components/design-system/section-nav.tsx";
import { BadgeSection } from "#src/components/design-system/sections/badge-section.tsx";
import { ColorSection } from "#src/components/design-system/sections/color-section.tsx";
import { DividerSection } from "#src/components/design-system/sections/divider-section.tsx";
import { TokensSection } from "#src/components/design-system/sections/tokens-section.tsx";
import { TypographySection } from "#src/components/design-system/sections/typography-section.tsx";
import { t } from "#src/i18n.ts";

export default function DesignSystem() {
  const heading = t({ en: "Design System", zh: "设计系统" });
  const sections = [
    { id: "tokens", label: t({ en: "Tokens", zh: "令牌" }) },
    { id: "color", label: t({ en: "Color", zh: "颜色" }) },
    { id: "typography", label: t({ en: "Typography", zh: "排版" }) },
    { id: "divider", label: t({ en: "Divider", zh: "分隔线" }) },
    { id: "badge", label: t({ en: "Badge", zh: "徽章" }) },
  ];

  return (
    <div css={styles.container}>
      <ViewTransition name={`project-card-name-${heading}`}>
        <h1 css={styles.heading}>{heading}</h1>
      </ViewTransition>
      <p css={styles.intro}>
        {t({
          en: "Tokens, primitives, and components that compose a refined visual language.",
          zh: "构成精致视觉语言的设计令牌、原语与组件。",
        })}
      </p>
      <SectionNav sections={sections} />
      <TokensSection />
      <ColorSection />
      <TypographySection />
      <DividerSection />
      <BadgeSection />
    </div>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    paddingBlock: space._6,
  },
  heading: {
    margin: 0,
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
  },
  intro: {
    margin: 0,
    fontSize: font.vpHeading3,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "60ch",
  },
});
