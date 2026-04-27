import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { ViewTransition } from "react";
import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "#src/_generated/system-palette.ts";
import { Badge } from "#src/components/design-system/badge.tsx";
import { Divider } from "#src/components/design-system/divider.tsx";
import { Heading } from "#src/components/design-system/heading.tsx";
import { SectionNav } from "#src/components/design-system/section-nav.tsx";
import { Section } from "#src/components/design-system/section.tsx";
import {
  Showcase,
  ShowcaseGrid,
  ShowcaseItem,
} from "#src/components/design-system/showcase.tsx";
import { Text } from "#src/components/design-system/text.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import {
  border,
  color,
  controlSize,
  font,
  gradient,
  shadow,
  space,
} from "#src/tokens.stylex.ts";

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

      <Section
        id="tokens"
        title={t({ en: "Tokens", zh: "设计令牌" })}
        description={t({
          en: "The atomic building blocks — colors, typography, spacing, shadows, and gradients that everything else composes from.",
          zh: "原子级构筑模块——颜色、排版、间距、阴影与渐变，构成上层一切设计。",
        })}
      >
        <Showcase label={t({ en: "Surfaces", zh: "表面" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="color.backgroundMain">
              <div css={[styles.swatch, styles.bgMain]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.backgroundRaised">
              <div css={[styles.swatch, styles.bgRaised]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.backgroundElevated">
              <div css={[styles.swatch, styles.bgElevated]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.backgroundSunken">
              <div css={[styles.swatch, styles.bgSunken]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.controlActive">
              <div css={[styles.swatch, styles.controlActive]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.controlActiveHover">
              <div css={[styles.swatch, styles.controlActiveHover]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.info">
              <div css={[styles.swatch, styles.info]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.success">
              <div css={[styles.swatch, styles.success]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.warning">
              <div css={[styles.swatch, styles.warning]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.danger">
              <div css={[styles.swatch, styles.danger]} />
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Surface tints", zh: "表面色调" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="color.surfaceAccentSubtle">
              <div css={[styles.swatch, styles.surfaceAccentSubtle]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.surfaceAccentMuted">
              <div css={[styles.swatch, styles.surfaceAccentMuted]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.surfaceInfoSubtle">
              <div css={[styles.swatch, styles.surfaceInfoSubtle]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.surfaceSuccessSubtle">
              <div css={[styles.swatch, styles.surfaceSuccessSubtle]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.surfaceWarningSubtle">
              <div css={[styles.swatch, styles.surfaceWarningSubtle]} />
            </ShowcaseItem>
            <ShowcaseItem label="color.surfaceDangerSubtle">
              <div css={[styles.swatch, styles.surfaceDangerSubtle]} />
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Shadows", zh: "阴影" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="shadow._1">
              <div css={[styles.shadowBlock, styles.shadow1]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow._2">
              <div css={[styles.shadowBlock, styles.shadow2]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow._3">
              <div css={[styles.shadowBlock, styles.shadow3]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow._4">
              <div css={[styles.shadowBlock, styles.shadow4]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow._5">
              <div css={[styles.shadowBlock, styles.shadow5]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow.glowAccentSoft">
              <div css={[styles.shadowBlock, styles.shadowGlowSoft]} />
            </ShowcaseItem>
            <ShowcaseItem label="shadow.glowAccent">
              <div css={[styles.shadowBlock, styles.shadowGlow]} />
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Gradients", zh: "渐变" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="gradient.accent">
              <div css={[styles.swatch, styles.gradientAccent]} />
            </ShowcaseItem>
            <ShowcaseItem label="gradient.aurora">
              <div css={[styles.swatch, styles.gradientAurora]} />
            </ShowcaseItem>
            <ShowcaseItem label="gradient.spotlight">
              <div css={[styles.swatch, styles.gradientSpotlight]} />
            </ShowcaseItem>
            <ShowcaseItem label="gradient.surfaceSubtle">
              <div css={[styles.swatch, styles.gradientSurfaceSubtle]} />
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Type scale", zh: "字号" })}>
          <div css={[flex.col, styles.typeStack]}>
            <TypeSample label="font.uiDisplay" sizeStyle={styles.typeDisplay}>
              {t({ en: "Display", zh: "展示" })}
            </TypeSample>
            <TypeSample label="font.uiHeading0" sizeStyle={styles.typeHeading0}>
              {t({ en: "Heading 0", zh: "标题 0" })}
            </TypeSample>
            <TypeSample label="font.uiHeading1" sizeStyle={styles.typeHeading1}>
              {t({ en: "Heading 1", zh: "标题 1" })}
            </TypeSample>
            <TypeSample label="font.uiHeading2" sizeStyle={styles.typeHeading2}>
              {t({ en: "Heading 2", zh: "标题 2" })}
            </TypeSample>
            <TypeSample label="font.uiHeading3" sizeStyle={styles.typeHeading3}>
              {t({ en: "Heading 3", zh: "标题 3" })}
            </TypeSample>
            <TypeSample label="font.uiBody" sizeStyle={styles.typeBody}>
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </TypeSample>
            <TypeSample
              label="font.uiBodySmall"
              sizeStyle={styles.typeBodySmall}
            >
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </TypeSample>
            <TypeSample label="font.uiCaption" sizeStyle={styles.typeCaption}>
              {t({ en: "Caption text", zh: "说明文字" })}
            </TypeSample>
            <TypeSample label="font.uiOverline" sizeStyle={styles.typeOverline}>
              {t({ en: "Overline label", zh: "上线标签" })}
            </TypeSample>
          </div>
        </Showcase>
      </Section>

      <Section
        id="color"
        title={t({ en: "Color", zh: "颜色" })}
        description={t({
          en: "Thirteen system hues expanded into tonal palettes via Material 3's HCT — CAM16 hue and chroma with CIE L* tones — so lightness steps stay perceptually even and chroma peaks where the sRGB gamut allows.",
          zh: "十三种系统色调通过 Material 3 的 HCT（CAM16 色相与饱和度，CIE L* 明度）展开为色调阶梯——明度等级感知均匀，饱和度在 sRGB 色域允许处达到峰值。",
        })}
      >
        <Showcase label={t({ en: "Tonal palettes", zh: "色调阶梯" })}>
          <div css={styles.toneTable} role="table">
            {systemPalette.map((palette) => (
              <div
                key={palette.name}
                css={[styles.toneRow, styles.toneRowGrid]}
                role="row"
              >
                <span css={styles.toneName} role="cell">
                  {palette.name}
                </span>
                {SYSTEM_PALETTE_TONES.map((tone) => {
                  const swatch = palette.tones[tone];
                  return (
                    <div
                      key={tone}
                      css={styles.toneSwatch}
                      style={{
                        backgroundColor: swatch.bg,
                        color: swatch.fg,
                      }}
                      role="cell"
                      aria-label={`${palette.name} ${String(tone)}`}
                    >
                      <span css={styles.toneNumber}>
                        {palette.name} {tone}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Showcase>
      </Section>

      <Section
        id="typography"
        title={t({ en: "Typography", zh: "排版" })}
        description={t({
          en: "Type styles built on the design tokens — headings for hierarchy, text for body content, with explicit tone and weight modifiers.",
          zh: "基于设计令牌的字体样式——以标题构建层级，以正文承载内容，配合显式的色调与字重修饰。",
        })}
      >
        <Showcase label={t({ en: "Headings", zh: "标题" })}>
          <div css={[flex.col, styles.typographyStack]}>
            <div css={[flex.col, styles.typographyRow]}>
              <Heading level={1} variant="display">
                {t({
                  en: "Display headline for hero moments",
                  zh: "用于关键瞬间的展示标题",
                })}
              </Heading>
              <span css={styles.typographyToken}>display</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Heading level={1} variant="h1">
                {t({ en: "Heading level one", zh: "一级标题" })}
              </Heading>
              <span css={styles.typographyToken}>h1</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Heading level={2} variant="h2">
                {t({ en: "Heading level two", zh: "二级标题" })}
              </Heading>
              <span css={styles.typographyToken}>h2</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Heading level={3} variant="h3">
                {t({ en: "Heading level three", zh: "三级标题" })}
              </Heading>
              <span css={styles.typographyToken}>h3</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Heading level={4} variant="h4">
                {t({ en: "Heading level four", zh: "四级标题" })}
              </Heading>
              <span css={styles.typographyToken}>h4</span>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Body & supporting", zh: "正文与辅助" })}>
          <div css={[flex.col, styles.typographyStack]}>
            <div css={[flex.col, styles.typographyRow]}>
              <Text variant="body">
                {t({
                  en: "The quick brown fox jumps over the lazy dog.",
                  zh: "敏捷的棕色狐狸跃过懒惰的狗。",
                })}
              </Text>
              <span css={styles.typographyToken}>body</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text variant="bodySmall">
                {t({
                  en: "The quick brown fox jumps over the lazy dog.",
                  zh: "敏捷的棕色狐狸跃过懒惰的狗。",
                })}
              </Text>
              <span css={styles.typographyToken}>bodySmall</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text variant="caption">
                {t({
                  en: "Caption text for image descriptions and footnotes.",
                  zh: "用于图片说明与脚注的辅助文字。",
                })}
              </Text>
              <span css={styles.typographyToken}>caption</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text variant="overline">
                {t({ en: "Overline label", zh: "上线标签" })}
              </Text>
              <span css={styles.typographyToken}>overline</span>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Tones", zh: "色调" })}>
          <div css={[flex.col, styles.typographyStack]}>
            <div css={[flex.col, styles.typographyRow]}>
              <Text tone="default">
                {t({
                  en: "Default tone — primary content.",
                  zh: "默认色调——主要内容。",
                })}
              </Text>
              <span css={styles.typographyToken}>default</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text tone="muted">
                {t({
                  en: "Muted tone — secondary information.",
                  zh: "弱化色调——次要信息。",
                })}
              </Text>
              <span css={styles.typographyToken}>muted</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text tone="subtle">
                {t({
                  en: "Subtle tone — incidental notes.",
                  zh: "微弱色调——附带备注。",
                })}
              </Text>
              <span css={styles.typographyToken}>subtle</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text tone="accent">
                {t({
                  en: "Accent tone — highlighted phrases.",
                  zh: "强调色调——突出语句。",
                })}
              </Text>
              <span css={styles.typographyToken}>accent</span>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Weights", zh: "字重" })}>
          <div css={[flex.col, styles.typographyStack]}>
            <div css={[flex.col, styles.typographyRow]}>
              <Text weight="regular">
                {t({
                  en: "Regular weight — comfortable reading default.",
                  zh: "常规字重——舒适的阅读默认值。",
                })}
              </Text>
              <span css={styles.typographyToken}>regular</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text weight="medium">
                {t({
                  en: "Medium weight — gentle emphasis.",
                  zh: "中等字重——轻度强调。",
                })}
              </Text>
              <span css={styles.typographyToken}>medium</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text weight="semibold">
                {t({
                  en: "Semibold weight — confident emphasis.",
                  zh: "半粗字重——明确强调。",
                })}
              </Text>
              <span css={styles.typographyToken}>semibold</span>
            </div>
            <div css={[flex.col, styles.typographyRow]}>
              <Text weight="bold">
                {t({
                  en: "Bold weight — strong emphasis.",
                  zh: "粗体字重——强烈强调。",
                })}
              </Text>
              <span css={styles.typographyToken}>bold</span>
            </div>
          </div>
        </Showcase>
      </Section>

      <Section
        id="divider"
        title={t({ en: "Divider", zh: "分隔线" })}
        description={t({
          en: "Visual separators for content. Subtle for in-flow breaks, bold for stronger separation, decorative for accent moments.",
          zh: "用于分隔内容的视觉元素。柔和用于自然分段，强烈用于明显分隔，装饰用于点缀重点。",
        })}
      >
        <Showcase label={t({ en: "Horizontal", zh: "水平" })}>
          <div css={[flex.col, styles.dividerHorizontalStack]}>
            <div css={[flex.col, styles.dividerHorizontalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Subtle dividers separate related content within a flow.",
                  zh: "柔和分隔线用于分隔流式内容中的相关部分。",
                })}
              </Text>
              <Divider variant="subtle" />
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "They keep the rhythm without breaking visual continuity.",
                  zh: "在不打断视觉连续性的同时保持内容节奏。",
                })}
              </Text>
            </div>
            <div css={[flex.col, styles.dividerHorizontalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Bold dividers signal stronger separation between groups.",
                  zh: "强烈分隔线用于明确划分不同的组别。",
                })}
              </Text>
              <Divider variant="bold" />
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Use them sparingly to mark meaningful transitions.",
                  zh: "克制使用，用于标记有意义的转换。",
                })}
              </Text>
            </div>
            <div css={[flex.col, styles.dividerHorizontalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Decorative dividers add accent for special moments.",
                  zh: "装饰分隔线为特殊时刻增添亮点。",
                })}
              </Text>
              <Divider variant="decorative" />
              <Text variant="bodySmall" tone="muted">
                {t({
                  en: "Reserve them for hero sections or feature highlights.",
                  zh: "适用于英雄区域或重点特性等场景。",
                })}
              </Text>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Vertical", zh: "垂直" })}>
          <div css={[flex.col, styles.dividerVerticalStack]}>
            <div css={[flex.row, styles.dividerVerticalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Subtle", zh: "柔和" })}
              </Text>
              <Divider orientation="vertical" variant="subtle" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Inline", zh: "行内" })}
              </Text>
              <Divider orientation="vertical" variant="subtle" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Separator", zh: "分隔" })}
              </Text>
            </div>
            <div css={[flex.row, styles.dividerVerticalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Bold", zh: "强烈" })}
              </Text>
              <Divider orientation="vertical" variant="bold" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Inline", zh: "行内" })}
              </Text>
              <Divider orientation="vertical" variant="bold" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Separator", zh: "分隔" })}
              </Text>
            </div>
            <div css={[flex.row, styles.dividerVerticalRow]}>
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Decorative", zh: "装饰" })}
              </Text>
              <Divider orientation="vertical" variant="decorative" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Inline", zh: "行内" })}
              </Text>
              <Divider orientation="vertical" variant="decorative" />
              <Text variant="bodySmall" tone="muted">
                {t({ en: "Separator", zh: "分隔" })}
              </Text>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Decorative", zh: "装饰" })}>
          <div css={[flex.col, styles.dividerDecorativeStack]}>
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "An accent stroke for marquee moments — wider and bolder for emphasis.",
                zh: "用于核心时刻的点睛笔触——更宽更明显以突出重点。",
              })}
            </Text>
            <Divider
              variant="decorative"
              css={styles.dividerDecorativeAccent}
            />
            <Text variant="bodySmall" tone="muted">
              {t({
                en: "Pair with hero typography or section transitions for richest effect.",
                zh: "搭配英雄排版或区段转换，可获得最佳效果。",
              })}
            </Text>
          </div>
        </Showcase>
      </Section>

      <Section
        id="badge"
        title={t({ en: "Badge", zh: "徽章" })}
        description={t({
          en: "Compact status and label indicators. Six tones for different signals — neutral, accent, and four semantic — at two sizes.",
          zh: "紧凑的状态和标签指示器。提供六种色调以传达不同信号——中性、强调与四种语义色——并支持两种尺寸。",
        })}
      >
        <Showcase label={t({ en: "Variants", zh: "风格" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="default">
              <Badge variant="default">
                {t({ en: "Default", zh: "默认" })}
              </Badge>
            </ShowcaseItem>
            <ShowcaseItem label="info">
              <Badge variant="info">{t({ en: "Info", zh: "信息" })}</Badge>
            </ShowcaseItem>
            <ShowcaseItem label="success">
              <Badge variant="success">
                {t({ en: "Success", zh: "成功" })}
              </Badge>
            </ShowcaseItem>
            <ShowcaseItem label="warning">
              <Badge variant="warning">
                {t({ en: "Warning", zh: "警告" })}
              </Badge>
            </ShowcaseItem>
            <ShowcaseItem label="danger">
              <Badge variant="danger">{t({ en: "Danger", zh: "危险" })}</Badge>
            </ShowcaseItem>
            <ShowcaseItem label="accent">
              <Badge variant="accent">{t({ en: "Accent", zh: "强调" })}</Badge>
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="small">
              <Badge size="small" variant="accent">
                {t({ en: "Small", zh: "小" })}
              </Badge>
            </ShowcaseItem>
            <ShowcaseItem label="medium">
              <Badge size="medium" variant="accent">
                {t({ en: "Medium", zh: "中" })}
              </Badge>
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "With icon", zh: "带图标" })}>
          <ShowcaseGrid>
            <ShowcaseItem label="small">
              <Badge
                size="small"
                variant="success"
                icon={<CheckIcon weight="bold" />}
              >
                {t({ en: "Verified", zh: "已验证" })}
              </Badge>
            </ShowcaseItem>
            <ShowcaseItem label="medium">
              <Badge
                size="medium"
                variant="warning"
                icon={<StarIcon weight="fill" />}
              >
                {t({ en: "Featured", zh: "精选" })}
              </Badge>
            </ShowcaseItem>
          </ShowcaseGrid>
        </Showcase>
      </Section>
    </div>
  );
}

interface TypeSampleProps {
  label: string;
  sizeStyle: StyleXStyles;
  children: React.ReactNode;
}

function TypeSample({ label, sizeStyle, children }: TypeSampleProps) {
  return (
    <div css={styles.typeRow}>
      <span css={styles.typeLabel}>{label}</span>
      <span css={[styles.typeSample, sizeStyle]}>{children}</span>
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

  swatch: {
    inlineSize: "64px",
    blockSize: "64px",
    borderRadius: border.radius_2,
    border: `1px solid ${color.borderSubtle}`,
  },
  bgMain: { backgroundColor: color.backgroundMain },
  bgRaised: { backgroundColor: color.backgroundRaised },
  bgElevated: { backgroundColor: color.backgroundElevated },
  bgSunken: { backgroundColor: color.backgroundSunken },
  controlActive: {
    backgroundColor: color.controlActive,
    borderColor: "transparent",
  },
  controlActiveHover: {
    backgroundColor: color.controlActiveHover,
    borderColor: "transparent",
  },
  info: { backgroundColor: color.info, borderColor: "transparent" },
  success: { backgroundColor: color.success, borderColor: "transparent" },
  warning: { backgroundColor: color.warning, borderColor: "transparent" },
  danger: { backgroundColor: color.danger, borderColor: "transparent" },

  surfaceAccentSubtle: { backgroundColor: color.surfaceAccentSubtle },
  surfaceAccentMuted: { backgroundColor: color.surfaceAccentMuted },
  surfaceInfoSubtle: { backgroundColor: color.surfaceInfoSubtle },
  surfaceSuccessSubtle: { backgroundColor: color.surfaceSuccessSubtle },
  surfaceWarningSubtle: { backgroundColor: color.surfaceWarningSubtle },
  surfaceDangerSubtle: { backgroundColor: color.surfaceDangerSubtle },

  shadowBlock: {
    inlineSize: "80px",
    blockSize: "80px",
    borderRadius: border.radius_2,
    backgroundColor: color.backgroundElevated,
    border: `1px solid ${color.borderSubtle}`,
  },
  shadow1: { boxShadow: shadow._1 },
  shadow2: { boxShadow: shadow._2 },
  shadow3: { boxShadow: shadow._3 },
  shadow4: { boxShadow: shadow._4 },
  shadow5: { boxShadow: shadow._5 },
  shadowGlowSoft: { boxShadow: shadow.glowAccentSoft },
  shadowGlow: { boxShadow: shadow.glowAccent },

  gradientAccent: {
    backgroundImage: gradient.accent,
    borderColor: "transparent",
  },
  gradientAurora: {
    backgroundImage: gradient.aurora,
    borderColor: "transparent",
  },
  gradientSpotlight: {
    backgroundImage: gradient.spotlight,
    backgroundColor: color.backgroundElevated,
  },
  gradientSurfaceSubtle: {
    backgroundImage: gradient.surfaceSubtle,
  },

  typeStack: {
    gap: space._4,
  },
  typeRow: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
  },
  typeLabel: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    fontFamily: font.familyMono,
  },
  typeSample: {
    color: color.textMain,
    lineHeight: font.lineHeight_2,
  },
  typeDisplay: { fontSize: font.uiDisplay, fontWeight: font.weight_8 },
  typeHeading0: { fontSize: font.uiHeading0, fontWeight: font.weight_8 },
  typeHeading1: { fontSize: font.uiHeading1, fontWeight: font.weight_7 },
  typeHeading2: { fontSize: font.uiHeading2, fontWeight: font.weight_7 },
  typeHeading3: { fontSize: font.uiHeading3, fontWeight: font.weight_6 },
  typeBody: { fontSize: font.uiBody, fontWeight: font.weight_4 },
  typeBodySmall: { fontSize: font.uiBodySmall, fontWeight: font.weight_4 },
  typeCaption: { fontSize: font.uiCaption, fontWeight: font.weight_5 },
  typeOverline: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },

  typographyStack: {
    gap: space._4,
  },
  typographyRow: {
    gap: space._0,
    alignItems: "flex-start",
  },
  typographyToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },

  dividerHorizontalStack: {
    gap: space._5,
  },
  dividerHorizontalRow: {
    gap: space._3,
  },
  dividerVerticalStack: {
    gap: space._4,
  },
  dividerVerticalRow: {
    gap: space._4,
    alignItems: "center",
    blockSize: controlSize._9,
  },
  dividerDecorativeStack: {
    gap: space._3,
  },
  dividerDecorativeAccent: {
    blockSize: "3px",
    borderRadius: "2px",
  },

  toneTable: {
    display: "flex",
    flexDirection: "column",
    overflowX: "auto",
  },
  toneRowGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(110px, 1fr) repeat(11, minmax(28px, 1fr))",
    alignItems: "stretch",
    minInlineSize: "fit-content",
  },
  toneRow: {
    alignItems: "stretch",
  },
  toneName: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingInlineStart: space._2,
    paddingInlineEnd: space._3,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  toneSwatch: {
    blockSize: "44px",
    position: "relative",
    zIndex: { default: 0, ":hover": 1 },
    borderRadius: { default: 0, ":hover": border.radius_2 },
    transform: { default: "scale(1)", ":hover": "scale(1.12)" },
    boxShadow: {
      default: "0 0 0 0 rgba(0, 0, 0, 0)",
      ":hover": shadow._3,
    },
    transition:
      "transform 180ms cubic-bezier(0.2, 0, 0, 1), box-shadow 180ms ease, border-radius 180ms ease",
  },
  toneNumber: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    fontWeight: font.weight_5,
    whiteSpace: "nowrap",
    opacity: { default: 0, ":hover": 1 },
    transform: {
      default: "translateY(2px)",
      ":hover": "translateY(0)",
    },
    transition: "opacity 160ms ease 40ms, transform 200ms ease 40ms",
  },
});
