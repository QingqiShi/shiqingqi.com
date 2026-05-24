import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Divider } from "@tuja/ui/components/divider";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import {
  border,
  color,
  controlSize,
  font,
  gradient,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { ViewTransition } from "react";
import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "#src/_generated/system-palette.ts";
import { SectionNav } from "#src/components/design-system/section-nav.tsx";
import { Section } from "#src/components/design-system/section.tsx";
import {
  Showcase,
  ShowcaseGrid,
  ShowcaseItem,
} from "#src/components/design-system/showcase.tsx";
import { t } from "#src/i18n.ts";

const FEATURED_TONES: ReadonlySet<number> = new Set([40, 80]);

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
          <p css={styles.surfacesHelper}>
            {t({
              en: "Seven surface tiers and three foreground tones. Surfaces lift toward white in light mode and toward higher lightness in dark mode; the foreground stays legible across every step.",
              zh: "七个表面层级与三种前景色调。表面在浅色模式下趋近纯白，在深色模式下逐级提亮；前景在每一层级皆保持可读。",
            })}
          </p>
          <div css={styles.surfacesBento}>
            <div css={styles.surfacesRamp}>
              <RampCell
                bg={styles.fillBgDim}
                fg={styles.textOnBg}
                label={t({ en: "Dim", zh: "暗淡" })}
                token="color.backgroundDim"
                span={styles.rampCellSpanDim}
              />
              <RampCell
                bg={styles.fillBg}
                fg={styles.textOnBg}
                label={t({ en: "Background", zh: "背景" })}
                token="color.background"
                span={styles.rampCellSpanBg}
              />
              <RampCell
                bg={styles.fillBg1}
                fg={styles.textOnBg}
                label="1"
                token="color.background1"
                numbered
              />
              <RampCell
                bg={styles.fillBg2}
                fg={styles.textOnBg}
                label="2"
                token="color.background2"
                numbered
              />
              <RampCell
                bg={styles.fillBg3}
                fg={styles.textOnBg}
                label="3"
                token="color.background3"
                numbered
              />
              <RampCell
                bg={styles.fillBg4}
                fg={styles.textOnBg}
                label="4"
                token="color.background4"
                numbered
              />
              <RampCell
                bg={styles.fillBg5}
                fg={styles.textOnBg}
                label="5"
                token="color.background5"
                numbered
              />
            </div>
            <div css={styles.foregroundRamp}>
              <RampCell
                bg={styles.fillTextMain}
                fg={styles.textOnForeground}
                label={t({ en: "Main Text", zh: "主要文字" })}
                token="color.textMain"
                compact
              />
              <RampCell
                bg={styles.fillTextMuted}
                fg={styles.textOnForeground}
                label={t({ en: "Muted Text", zh: "弱化文字" })}
                token="color.textMuted"
                compact
              />
              <RampCell
                bg={styles.fillTextSubtle}
                fg={styles.textOnForeground}
                label={t({ en: "Subtle Text", zh: "微弱文字" })}
                token="color.textSubtle"
                compact
              />
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Roles", zh: "角色" })}>
          <div css={styles.rolesGrid}>
            <RoleColumn
              name={t({ en: "Accent", zh: "强调" })}
              cells={[
                {
                  size: "large",
                  bg: styles.fillAccent,
                  fg: styles.accentOn,
                  label: t({ en: "Accent", zh: "强调" }),
                  token: "color.accent",
                },
                {
                  size: "thin",
                  bg: styles.fillAccentHover,
                  fg: styles.accentOn,
                  label: t({ en: "Accent Hover", zh: "强调悬停" }),
                  token: "color.accentHover",
                },
                {
                  size: "medium",
                  bg: styles.fillSurfaceAccentSubtle,
                  fg: styles.accentText,
                  label: t({ en: "Accent Surface", zh: "强调表面" }),
                  token: "color.surfaceAccentSubtle",
                },
                {
                  size: "thin",
                  bg: styles.fillAccentText,
                  fg: styles.accentOn,
                  label: t({ en: "Accent Text", zh: "强调文字" }),
                  token: "color.accentText",
                },
              ]}
            />
            <RoleColumn
              name={t({ en: "Info", zh: "信息" })}
              cells={[
                {
                  size: "large",
                  bg: styles.fillInfo,
                  fg: styles.textInfoOn,
                  label: t({ en: "Info", zh: "信息" }),
                  token: "color.info",
                },
                {
                  size: "thin",
                  bg: styles.fillInfoHover,
                  fg: styles.textInfoOn,
                  label: t({ en: "Info Hover", zh: "信息悬停" }),
                  token: "color.infoHover",
                },
                {
                  size: "medium",
                  bg: styles.fillSurfaceInfoSubtle,
                  fg: styles.textInfoText,
                  label: t({ en: "Info Surface", zh: "信息表面" }),
                  token: "color.surfaceInfoSubtle",
                },
                {
                  size: "thin",
                  bg: styles.fillInfoText,
                  fg: styles.textInfoOn,
                  label: t({ en: "Info Text", zh: "信息文字" }),
                  token: "color.infoText",
                },
              ]}
            />
            <RoleColumn
              name={t({ en: "Success", zh: "成功" })}
              cells={[
                {
                  size: "large",
                  bg: styles.fillSuccess,
                  fg: styles.textSuccessOn,
                  label: t({ en: "Success", zh: "成功" }),
                  token: "color.success",
                },
                {
                  size: "thin",
                  bg: styles.fillSuccessHover,
                  fg: styles.textSuccessOn,
                  label: t({ en: "Success Hover", zh: "成功悬停" }),
                  token: "color.successHover",
                },
                {
                  size: "medium",
                  bg: styles.fillSurfaceSuccessSubtle,
                  fg: styles.textSuccessText,
                  label: t({ en: "Success Surface", zh: "成功表面" }),
                  token: "color.surfaceSuccessSubtle",
                },
                {
                  size: "thin",
                  bg: styles.fillSuccessText,
                  fg: styles.textSuccessOn,
                  label: t({ en: "Success Text", zh: "成功文字" }),
                  token: "color.successText",
                },
              ]}
            />
            <RoleColumn
              name={t({ en: "Warning", zh: "警告" })}
              cells={[
                {
                  size: "large",
                  bg: styles.fillWarning,
                  fg: styles.textWarningOn,
                  label: t({ en: "Warning", zh: "警告" }),
                  token: "color.warning",
                },
                {
                  size: "thin",
                  bg: styles.fillWarningHover,
                  fg: styles.textWarningOn,
                  label: t({ en: "Warning Hover", zh: "警告悬停" }),
                  token: "color.warningHover",
                },
                {
                  size: "medium",
                  bg: styles.fillSurfaceWarningSubtle,
                  fg: styles.textWarningText,
                  label: t({ en: "Warning Surface", zh: "警告表面" }),
                  token: "color.surfaceWarningSubtle",
                },
                {
                  size: "thin",
                  bg: styles.fillWarningText,
                  fg: styles.textWarningOn,
                  label: t({ en: "Warning Text", zh: "警告文字" }),
                  token: "color.warningText",
                },
              ]}
            />
            <RoleColumn
              name={t({ en: "Danger", zh: "危险" })}
              cells={[
                {
                  size: "large",
                  bg: styles.fillDanger,
                  fg: styles.textDangerOn,
                  label: t({ en: "Danger", zh: "危险" }),
                  token: "color.danger",
                },
                {
                  size: "thin",
                  bg: styles.fillDangerHover,
                  fg: styles.textDangerOn,
                  label: t({ en: "Danger Hover", zh: "危险悬停" }),
                  token: "color.dangerHover",
                },
                {
                  size: "medium",
                  bg: styles.fillSurfaceDangerSubtle,
                  fg: styles.textDangerText,
                  label: t({ en: "Danger Surface", zh: "危险表面" }),
                  token: "color.surfaceDangerSubtle",
                },
                {
                  size: "thin",
                  bg: styles.fillDangerText,
                  fg: styles.textDangerOn,
                  label: t({ en: "Danger Text", zh: "危险文字" }),
                  token: "color.dangerText",
                },
              ]}
            />
          </div>
        </Showcase>

        <Showcase label={t({ en: "Borders & controls", zh: "边框与控件" })}>
          <div css={styles.chipsLayout}>
            <div css={styles.chipsGroup}>
              <span css={styles.chipsGroupLabel}>
                {t({ en: "Border", zh: "边框" })}
              </span>
              <div css={styles.chipsRow}>
                <BorderChip
                  rule={styles.ruleBorderSubtle}
                  token="color.borderSubtle"
                />
                <BorderChip
                  rule={styles.ruleBorderStrong}
                  token="color.borderStrong"
                />
                <BorderChip
                  rule={styles.ruleAccentBorder}
                  token="color.accentBorder"
                />
              </div>
            </div>
            <div css={styles.chipsGroup}>
              <span css={styles.chipsGroupLabel}>
                {t({ en: "Control", zh: "控件" })}
              </span>
              <div css={styles.chipsRow}>
                <div css={styles.previewChip}>
                  <div css={styles.previewChipSample}>
                    <div css={[styles.toggleTrack, styles.fillControlTrack]}>
                      <div
                        css={[styles.toggleThumb, styles.fillControlThumb]}
                      />
                    </div>
                  </div>
                  <span css={styles.cellToken}>color.controlTrack + thumb</span>
                </div>
                <div css={styles.previewChip}>
                  <div css={styles.previewChipSample}>
                    <div
                      css={[styles.activePill, styles.fillControlActiveSubtle]}
                    >
                      <span css={[styles.activePillLabel, styles.accentText]}>
                        {t({ en: "Active", zh: "激活" })}
                      </span>
                    </div>
                  </div>
                  <span css={styles.cellToken}>color.controlActiveSubtle</span>
                </div>
              </div>
            </div>
          </div>
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
          </ShowcaseGrid>
        </Showcase>

        <Showcase label={t({ en: "Families", zh: "字体族" })}>
          <div css={styles.familiesGrid}>
            <div css={styles.familyCard}>
              <header css={styles.familyHeader}>
                <span css={styles.familyToken}>font.family</span>
                <span css={styles.familyValue}>Inter, sans-serif</span>
              </header>
              <div css={[styles.familySpecimen, styles.familySans]}>Aa</div>
              <div css={[styles.familyCharset, styles.familySans]}>
                <p css={styles.familyCharsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p css={styles.familyCharsetLine}>abcdefghijklmnopqrstuvwxyz</p>
                <p css={styles.familyCharsetLine}>0123456789 — &amp; ?!“”</p>
              </div>
            </div>
            <div css={styles.familyCard}>
              <header css={styles.familyHeader}>
                <span css={styles.familyToken}>font.familyMono</span>
                <span css={styles.familyValue}>
                  ui-monospace, SF Mono, Menlo
                </span>
              </header>
              <div css={[styles.familySpecimen, styles.familyMono]}>Aa</div>
              <div css={[styles.familyCharset, styles.familyMono]}>
                <p css={styles.familyCharsetLine}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p css={styles.familyCharsetLine}>abcdefghijklmnopqrstuvwxyz</p>
                <p css={styles.familyCharsetLine}>{"0123456789 — & ?! {}"}</p>
              </div>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Weights", zh: "字重" })}>
          <div css={styles.weightsGrid}>
            <SpecCard token="font.weight_1" meta="100">
              <span css={[styles.weightSpecimen, styles.weight1]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_2" meta="200">
              <span css={[styles.weightSpecimen, styles.weight2]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_3" meta="300">
              <span css={[styles.weightSpecimen, styles.weight3]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_4" meta="400">
              <span css={[styles.weightSpecimen, styles.weight4]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_5" meta="500">
              <span css={[styles.weightSpecimen, styles.weight5]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_6" meta="600">
              <span css={[styles.weightSpecimen, styles.weight6]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_7" meta="700">
              <span css={[styles.weightSpecimen, styles.weight7]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_8" meta="800">
              <span css={[styles.weightSpecimen, styles.weight8]}>Ag</span>
            </SpecCard>
            <SpecCard token="font.weight_9" meta="900">
              <span css={[styles.weightSpecimen, styles.weight9]}>Ag</span>
            </SpecCard>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Type scale", zh: "字号" })}>
          <div css={[flex.col, styles.typeStack]}>
            <TypeSample
              label="font.uiDisplay"
              meta="3rem"
              sizeStyle={styles.typeDisplay}
            >
              {t({ en: "Display", zh: "展示" })}
            </TypeSample>
            <TypeSample
              label="font.uiHeading0"
              meta="2rem"
              sizeStyle={styles.typeHeading0}
            >
              {t({ en: "Heading 0", zh: "标题 0" })}
            </TypeSample>
            <TypeSample
              label="font.uiHeading1"
              meta="1.5rem"
              sizeStyle={styles.typeHeading1}
            >
              {t({ en: "Heading 1", zh: "标题 1" })}
            </TypeSample>
            <TypeSample
              label="font.uiHeading2"
              meta="1.25rem"
              sizeStyle={styles.typeHeading2}
            >
              {t({ en: "Heading 2", zh: "标题 2" })}
            </TypeSample>
            <TypeSample
              label="font.uiHeading3"
              meta="1.1rem"
              sizeStyle={styles.typeHeading3}
            >
              {t({ en: "Heading 3", zh: "标题 3" })}
            </TypeSample>
            <TypeSample
              label="font.uiBody"
              meta="1rem"
              sizeStyle={styles.typeBody}
            >
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </TypeSample>
            <TypeSample
              label="font.uiBodySmall"
              meta="0.85rem"
              sizeStyle={styles.typeBodySmall}
            >
              {t({
                en: "The quick brown fox jumps over the lazy dog.",
                zh: "敏捷的棕色狐狸跃过懒惰的狗。",
              })}
            </TypeSample>
            <TypeSample
              label="font.uiCaption"
              meta="0.75rem"
              sizeStyle={styles.typeCaption}
            >
              {t({ en: "Caption text", zh: "说明文字" })}
            </TypeSample>
            <TypeSample
              label="font.uiOverline"
              meta="0.7rem"
              sizeStyle={styles.typeOverline}
            >
              {t({ en: "Overline label", zh: "上线标签" })}
            </TypeSample>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Responsive sizes", zh: "响应式字号" })}>
          <p css={styles.cqHelper}>
            {t({
              en: "Viewport-responsive sizes (vp*) step at the sm/md/lg breakpoints — use them on landing pages where headlines need to grow with the canvas. The page heading above uses font.vpDisplay.",
              zh: "视口响应字号（vp*）在 sm/md/lg 断点处分级——适用于落地页中需要随画布扩展的标题。本页主标题即采用 font.vpDisplay。",
            })}
          </p>
          <div css={[flex.col, styles.typeStack]}>
            <TypeSample
              label="font.vpDisplay"
              meta="2 · 2.8 · 3.75 · 5.25rem"
              sizeStyle={styles.typeVpDisplay}
            >
              {t({ en: "Display", zh: "展示" })}
            </TypeSample>
            <TypeSample
              label="font.vpSubDisplay"
              meta="1 · 1.1 · 1.3 · 1.6rem"
              sizeStyle={styles.typeVpSubDisplay}
            >
              {t({ en: "Sub-display", zh: "副展示" })}
            </TypeSample>
            <TypeSample
              label="font.vpHeading1"
              meta="1.3 · 1.4 · 1.6 · 2rem"
              sizeStyle={styles.typeVpHeading1}
            >
              {t({ en: "Heading 1", zh: "标题 1" })}
            </TypeSample>
            <TypeSample
              label="font.vpHeading2"
              meta="1.2 · 1.3 · 1.5 · 1.8rem"
              sizeStyle={styles.typeVpHeading2}
            >
              {t({ en: "Heading 2", zh: "标题 2" })}
            </TypeSample>
            <TypeSample
              label="font.vpHeading3"
              meta="1 · 1.1 · 1.2 · 1.3rem"
              sizeStyle={styles.typeVpHeading3}
            >
              {t({ en: "Heading 3", zh: "标题 3" })}
            </TypeSample>
          </div>
          <p css={styles.cqHelper}>
            {t({
              en: "Container-responsive sizes (cq*) track their parent's inline size — use them inside responsive grids where the type should scale with item width, not viewport. font.cqTitle clamps between 1.1rem and 1.4rem; the two containers below render the same token at different widths.",
              zh: "容器响应字号（cq*）随父级行内尺寸变化——适用于希望字号追踪容器宽度的响应式网格。font.cqTitle 在 1.1rem 与 1.4rem 之间夹值；下方两个容器以不同宽度呈现同一令牌。",
            })}
          </p>
          <div css={styles.cqDemo}>
            <div css={styles.cqContainer}>
              <span css={styles.cqContainerLabel}>font.cqTitle · narrow</span>
              <p css={styles.typeCqTitle}>
                {t({ en: "Container title", zh: "容器标题" })}
              </p>
            </div>
            <div css={styles.cqContainer}>
              <span css={styles.cqContainerLabel}>font.cqTitle · wide</span>
              <p css={styles.typeCqTitle}>
                {t({ en: "Container title", zh: "容器标题" })}
              </p>
            </div>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Line heights", zh: "行高" })}>
          <p css={styles.cqHelper}>
            {t({
              en: "Same passage at every line-height — rhythm tightens at the bottom of the scale and opens up toward the top.",
              zh: "同一段文字以不同行高呈现——下端紧凑、上端舒缓。",
            })}
          </p>
          <div css={styles.lineHeightsGrid}>
            <SpecCard token="font.lineHeight_00" meta="0.95">
              <p css={[styles.lineHeightSample, styles.lh00]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_0" meta="1">
              <p css={[styles.lineHeightSample, styles.lh0]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_1" meta="1.1">
              <p css={[styles.lineHeightSample, styles.lh1]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_2" meta="1.2">
              <p css={[styles.lineHeightSample, styles.lh2]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_3" meta="1.3">
              <p css={[styles.lineHeightSample, styles.lh3]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_4" meta="1.5">
              <p css={[styles.lineHeightSample, styles.lh4]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
            <SpecCard token="font.lineHeight_5" meta="2">
              <p css={[styles.lineHeightSample, styles.lh5]}>
                {t({
                  en: "Choose line height to match the reading pace — tighter for headlines, looser for body.",
                  zh: "行高随节奏而定——标题宜紧凑，正文宜舒缓。",
                })}
              </p>
            </SpecCard>
          </div>
        </Showcase>

        <Showcase label={t({ en: "Letter spacing", zh: "字距" })}>
          <div css={styles.trackingGrid}>
            <SpecCard token="font.trackingTight" meta="-0.025em">
              <span css={[styles.trackingSample, styles.trackTight]}>
                {t({ en: "Refined display", zh: "精致展示" })}
              </span>
            </SpecCard>
            <SpecCard token="font.trackingSnug" meta="-0.01em">
              <span css={[styles.trackingSample, styles.trackSnug]}>
                {t({ en: "Refined display", zh: "精致展示" })}
              </span>
            </SpecCard>
            <SpecCard token="font.trackingNormal" meta="0">
              <span css={[styles.trackingSample, styles.trackNormal]}>
                {t({ en: "Refined display", zh: "精致展示" })}
              </span>
            </SpecCard>
            <SpecCard token="font.trackingWide" meta="0.025em">
              <span css={[styles.trackingSample, styles.trackWide]}>
                {t({ en: "Refined display", zh: "精致展示" })}
              </span>
            </SpecCard>
            <SpecCard token="font.trackingWider" meta="0.05em">
              <span css={[styles.trackingSample, styles.trackWider]}>
                {t({ en: "Overline label", zh: "上线标签" })}
              </span>
            </SpecCard>
            <SpecCard token="font.trackingWidest" meta="0.12em">
              <span css={[styles.trackingSample, styles.trackWidest]}>
                {t({ en: "Eyebrow heading", zh: "眉题标签" })}
              </span>
            </SpecCard>
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
          <p css={styles.toneHelper}>
            {t({
              en: "Tones 40 and 80 are featured as key stops — the typical pairing for solid roles and their soft surfaces.",
              zh: "40 与 80 为关键色阶——通常用作实色角色与对应柔和表面。",
            })}
          </p>
          <div css={styles.palettesStack}>
            {systemPalette.map((palette) => (
              <div
                key={palette.name}
                css={styles.paletteCard}
                role="group"
                aria-label={palette.name}
              >
                <div css={styles.paletteHeader}>
                  <span css={styles.paletteName}>{palette.name}</span>
                  <span css={styles.paletteSource}>{palette.source}</span>
                </div>
                <div css={styles.paletteTones}>
                  {SYSTEM_PALETTE_TONES.map((tone) => {
                    const swatch = palette.tones[tone];
                    const featured = FEATURED_TONES.has(tone);
                    return (
                      <div
                        key={tone}
                        css={[
                          styles.paletteTone,
                          featured
                            ? styles.paletteToneFeatured
                            : styles.paletteToneRegular,
                        ]}
                        style={{
                          backgroundColor: swatch.bg,
                          color: swatch.fg,
                        }}
                        aria-label={`${palette.name} ${String(tone)}`}
                      >
                        <span css={styles.paletteToneNumber}>{tone}</span>
                      </div>
                    );
                  })}
                </div>
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
  meta?: string;
  sizeStyle: StyleXStyles;
  children: React.ReactNode;
}

function TypeSample({ label, meta, sizeStyle, children }: TypeSampleProps) {
  return (
    <div css={styles.typeRow}>
      <div css={styles.typeLabelRow}>
        <span css={styles.typeLabel}>{label}</span>
        {meta ? <span css={styles.typeMeta}>{meta}</span> : null}
      </div>
      <span css={[styles.typeSample, sizeStyle]}>{children}</span>
    </div>
  );
}

interface SpecCardProps {
  token: string;
  meta: string;
  children: React.ReactNode;
}

function SpecCard({ token, meta, children }: SpecCardProps) {
  return (
    <div css={styles.specCard}>
      <div css={styles.specCardHeader}>
        <span css={styles.specCardToken}>{token}</span>
        <span css={styles.specCardMeta}>{meta}</span>
      </div>
      {children}
    </div>
  );
}

type RoleCellSize = "large" | "medium" | "thin";

interface RoleCell {
  size: RoleCellSize;
  bg: StyleXStyles;
  fg: StyleXStyles;
  label: string;
  token: string;
}

interface RoleColumnProps {
  name: string;
  cells: readonly RoleCell[];
}

function RoleColumn({ name, cells }: RoleColumnProps) {
  return (
    <div css={styles.roleColumn} aria-label={name}>
      {cells.map((cell) => {
        const sizeStyle =
          cell.size === "large"
            ? styles.roleCellLarge
            : cell.size === "medium"
              ? styles.roleCellMedium
              : styles.roleCellThin;
        return (
          <div key={cell.token} css={[styles.roleCell, sizeStyle, cell.bg]}>
            <span css={[styles.cellLabel, cell.fg]}>{cell.label}</span>
            <span css={[styles.cellToken, cell.fg]}>{cell.token}</span>
          </div>
        );
      })}
    </div>
  );
}

interface RampCellProps {
  bg: StyleXStyles;
  fg: StyleXStyles;
  label: string;
  token: string;
  span?: StyleXStyles;
  numbered?: boolean;
  compact?: boolean;
}

function RampCell({
  bg,
  fg,
  label,
  token,
  span,
  numbered,
  compact,
}: RampCellProps) {
  return (
    <div css={[styles.rampCell, bg, span, compact && styles.rampCellCompact]}>
      <span css={[styles.cellLabel, fg, numbered && styles.rampLabelNumbered]}>
        {label}
      </span>
      <span css={[styles.cellToken, fg, numbered && styles.rampTokenNumbered]}>
        {token}
      </span>
    </div>
  );
}

interface BorderChipProps {
  rule: StyleXStyles;
  token: string;
}

function BorderChip({ rule, token }: BorderChipProps) {
  return (
    <div css={styles.previewChip}>
      <div css={styles.previewChipSample}>
        <div css={[styles.borderRule, rule]} />
      </div>
      <span css={styles.cellToken}>{token}</span>
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

  // ─── Roles bento ────────────────────────────────────────────────
  rolesGrid: {
    display: "grid",
    // 5 roles divide cleanly as 1×5, 3+2, or 5×1 — those breakpoints avoid orphans.
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(5, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  roleColumn: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
  },
  roleCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBlock: space._2,
    paddingInline: space._3,
    gap: space._0,
  },
  roleCellLarge: {
    minBlockSize: "108px",
  },
  roleCellMedium: {
    minBlockSize: "72px",
  },
  roleCellThin: {
    minBlockSize: "44px",
    paddingBlock: space._1,
  },
  cellLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingSnug,
    lineHeight: font.lineHeight_2,
  },
  cellToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    opacity: 0.85,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },

  // ─── Surfaces ramp + aside ──────────────────────────────────────
  surfacesHelper: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
  surfacesBento: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
  },
  surfacesRamp: {
    display: "grid",
    // default-sm: stack; md: featured bg + dim atop 5 numbered cells; lg: full 7-cell bento.
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(5, minmax(0, 1fr))",
      [breakpoints.lg]: "1.5fr 2.5fr 1fr 1fr 1fr 1fr 1fr",
    },
    gap: space._00,
  },
  foregroundRamp: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
    },
    gap: space._00,
  },
  rampCell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBlock: space._3,
    paddingInline: space._3,
    gap: space._0,
    minInlineSize: 0,
    minBlockSize: {
      default: "72px",
      [breakpoints.md]: "140px",
    },
    overflow: "hidden",
  },
  rampCellCompact: {
    paddingBlock: space._2,
    minBlockSize: {
      default: "56px",
      [breakpoints.md]: "72px",
    },
  },
  rampCellSpanBg: {
    gridColumn: {
      default: "auto",
      [breakpoints.md]: "span 3",
      [breakpoints.lg]: "auto",
    },
  },
  rampCellSpanDim: {
    gridColumn: {
      default: "auto",
      [breakpoints.md]: "span 2",
      [breakpoints.lg]: "auto",
    },
  },
  // Numbered cells (1–5) get narrow as soon as they sit in a row — the bg/dim
  // cells already establish the "color.backgroundN" pattern, so hide redundant
  // token text and feature the number itself.
  rampTokenNumbered: {
    display: {
      default: "block",
      [breakpoints.md]: "none",
    },
  },
  rampLabelNumbered: {
    fontSize: {
      default: font.uiBodySmall,
      [breakpoints.md]: font.uiHeading2,
    },
  },

  // ─── Border / Control chips ─────────────────────────────────────
  chipsLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: space._4,
  },
  chipsGroup: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  chipsGroupLabel: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    fontWeight: font.weight_6,
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._2,
  },
  previewChip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    minInlineSize: "128px",
    minBlockSize: "104px",
    borderRadius: border.radius_2,
    backgroundColor: color.background2,
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
  },
  previewChipSample: {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  borderRule: {
    blockSize: 0,
    inlineSize: "100%",
  },
  ruleBorderSubtle: {
    borderBlockEndWidth: "1px",
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.borderSubtle,
  },
  ruleBorderStrong: {
    borderBlockEndWidth: "1px",
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.borderStrong,
  },
  ruleAccentBorder: {
    borderBlockEndWidth: "2px",
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.accentBorder,
  },
  toggleTrack: {
    display: "flex",
    alignItems: "center",
    inlineSize: "56px",
    blockSize: "28px",
    paddingInline: "3px",
    borderRadius: border.radius_round,
  },
  toggleThumb: {
    inlineSize: "22px",
    blockSize: "22px",
    borderRadius: border.radius_round,
    boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
  },
  activePill: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._1,
    paddingInline: space._3,
    borderRadius: border.radius_round,
  },
  activePillLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_1,
  },

  // ─── Fill helpers ───────────────────────────────────────────────
  fillBg: { backgroundColor: color.background },
  fillBgDim: { backgroundColor: color.backgroundDim },
  fillBg1: { backgroundColor: color.background1 },
  fillBg2: { backgroundColor: color.background2 },
  fillBg3: { backgroundColor: color.background3 },
  fillBg4: { backgroundColor: color.background4 },
  fillBg5: { backgroundColor: color.background5 },

  fillAccent: { backgroundColor: color.accent },
  fillAccentHover: { backgroundColor: color.accentHover },
  fillControlActiveSubtle: { backgroundColor: color.controlActiveSubtle },
  fillControlTrack: { backgroundColor: color.controlTrack },
  fillControlThumb: { backgroundColor: color.controlThumb },

  fillSurfaceAccentSubtle: { backgroundColor: color.surfaceAccentSubtle },
  fillSurfaceInfoSubtle: { backgroundColor: color.surfaceInfoSubtle },
  fillSurfaceSuccessSubtle: { backgroundColor: color.surfaceSuccessSubtle },
  fillSurfaceWarningSubtle: { backgroundColor: color.surfaceWarningSubtle },
  fillSurfaceDangerSubtle: { backgroundColor: color.surfaceDangerSubtle },

  fillInfo: { backgroundColor: color.info },
  fillSuccess: { backgroundColor: color.success },
  fillWarning: { backgroundColor: color.warning },
  fillDanger: { backgroundColor: color.danger },

  fillInfoHover: { backgroundColor: color.infoHover },
  fillSuccessHover: { backgroundColor: color.successHover },
  fillWarningHover: { backgroundColor: color.warningHover },
  fillDangerHover: { backgroundColor: color.dangerHover },

  fillAccentText: { backgroundColor: color.accentText },
  fillTextMain: { backgroundColor: color.textMain },
  fillTextMuted: { backgroundColor: color.textMuted },
  fillTextSubtle: { backgroundColor: color.textSubtle },
  fillInfoText: { backgroundColor: color.infoText },
  fillSuccessText: { backgroundColor: color.successText },
  fillWarningText: { backgroundColor: color.warningText },
  fillDangerText: { backgroundColor: color.dangerText },

  // ─── Text-color helpers ─────────────────────────────────────────
  accentOn: { color: color.accentOn },
  textOnBg: { color: color.textMain },
  textOnForeground: { color: color.background },
  textMutedStandalone: { color: color.textMuted },
  textSubtleStandalone: { color: color.textSubtle },
  accentText: { color: color.accentText },

  textInfoOn: { color: color.infoOn },
  textInfoText: { color: color.infoText },

  textSuccessOn: { color: color.successOn },
  textSuccessText: { color: color.successText },

  textWarningOn: { color: color.warningOn },
  textWarningText: { color: color.warningText },

  textDangerOn: { color: color.dangerOn },
  textDangerText: { color: color.dangerText },

  // ─── Shadows / Gradients (unchanged) ────────────────────────────
  shadowBlock: {
    inlineSize: "80px",
    blockSize: "80px",
    borderRadius: border.radius_2,
    backgroundColor: color.background3,
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
    backgroundColor: color.background3,
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
  typeLabelRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: space._2,
    rowGap: space._00,
  },
  typeMeta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },

  typeVpDisplay: {
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
  },
  typeVpSubDisplay: {
    fontSize: font.vpSubDisplay,
    fontWeight: font.weight_5,
  },
  typeVpHeading1: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
  },
  typeVpHeading2: {
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
  },
  typeVpHeading3: {
    fontSize: font.vpHeading3,
    fontWeight: font.weight_6,
  },
  typeCqTitle: {
    margin: 0,
    fontSize: font.cqTitle,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  cqHelper: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
  cqDemo: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "1fr 2.5fr",
    },
    gap: space._3,
  },
  cqContainer: {
    containerType: "inline-size",
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.background2,
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
  },
  cqContainerLabel: {
    display: "block",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    marginBlockEnd: space._1,
  },

  specCard: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.background2,
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
    minInlineSize: 0,
  },
  specCardHeader: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  specCardToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minInlineSize: 0,
    maxInlineSize: "100%",
  },
  specCardMeta: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },

  familiesGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._3,
  },
  familyCard: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    paddingBlock: space._4,
    paddingInline: space._4,
    borderRadius: border.radius_2,
    backgroundColor: color.background2,
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
    minInlineSize: 0,
  },
  familyHeader: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  familyToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  familyValue: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    overflowWrap: "anywhere",
  },
  familySpecimen: {
    fontSize: {
      default: "5rem",
      [breakpoints.md]: "6rem",
    },
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_0,
    letterSpacing: font.trackingTight,
    color: color.textMain,
    marginBlock: space._1,
  },
  familyCharset: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    lineHeight: font.lineHeight_3,
    overflowWrap: "anywhere",
  },
  familyCharsetLine: {
    margin: 0,
  },
  familySans: { fontFamily: font.family },
  familyMono: { fontFamily: font.familyMono },

  weightsGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [breakpoints.sm]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(5, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(9, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  weightSpecimen: {
    fontSize: font.uiHeading0,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
    color: color.textMain,
    paddingBlock: space._1,
  },
  weight1: { fontWeight: font.weight_1 },
  weight2: { fontWeight: font.weight_2 },
  weight3: { fontWeight: font.weight_3 },
  weight4: { fontWeight: font.weight_4 },
  weight5: { fontWeight: font.weight_5 },
  weight6: { fontWeight: font.weight_6 },
  weight7: { fontWeight: font.weight_7 },
  weight8: { fontWeight: font.weight_8 },
  weight9: { fontWeight: font.weight_9 },

  lineHeightsGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.sm]: "repeat(2, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(4, minmax(0, 1fr))",
    },
    gap: space._2,
    alignItems: "start",
  },
  lineHeightSample: {
    margin: 0,
    fontSize: font.uiBodySmall,
    color: color.textMain,
  },
  lh00: { lineHeight: font.lineHeight_00 },
  lh0: { lineHeight: font.lineHeight_0 },
  lh1: { lineHeight: font.lineHeight_1 },
  lh2: { lineHeight: font.lineHeight_2 },
  lh3: { lineHeight: font.lineHeight_3 },
  lh4: { lineHeight: font.lineHeight_4 },
  lh5: { lineHeight: font.lineHeight_5 },

  trackingGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.sm]: "repeat(2, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(3, minmax(0, 1fr))",
    },
    gap: space._2,
  },
  trackingSample: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_5,
    color: color.textMain,
    paddingBlock: space._1,
  },
  trackTight: { letterSpacing: font.trackingTight },
  trackSnug: { letterSpacing: font.trackingSnug },
  trackNormal: { letterSpacing: font.trackingNormal },
  trackWide: { letterSpacing: font.trackingWide },
  trackWider: {
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
  },
  trackWidest: {
    letterSpacing: font.trackingWidest,
    textTransform: "uppercase",
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

  // ─── Tonal palettes ─────────────────────────────────────────────
  toneHelper: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
  palettesStack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  paletteCard: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  paletteHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space._3,
  },
  paletteName: {
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  paletteSource: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  paletteTones: {
    display: "grid",
    // Equal columns at narrow widths so every tone number stays legible;
    // weighted bento ratios kick in only at lg where there's room for them.
    gridTemplateColumns: {
      default: "repeat(11, minmax(0, 1fr))",
      [breakpoints.lg]:
        "0.5fr 0.7fr 1fr 1.2fr 3fr 1.2fr 1.5fr 2fr 3fr 1.2fr 0.5fr",
    },
    minBlockSize: "80px",
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.borderSubtle}`,
  },
  paletteTone: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition:
      "transform 180ms cubic-bezier(0.2, 0, 0, 1), box-shadow 180ms ease",
    position: "relative",
    zIndex: { default: 0, ":hover": 1 },
    transform: { default: "scale(1)", ":hover": "scale(1.06)" },
    boxShadow: { default: "none", ":hover": shadow._3 },
  },
  paletteToneRegular: {
    minBlockSize: "44px",
  },
  paletteToneFeatured: {
    minBlockSize: "80px",
  },
  paletteToneNumber: {
    // 11 tones at very narrow widths leave no room for labels — hide until md.
    display: {
      default: "none",
      [breakpoints.md]: "block",
    },
    fontSize: font.uiCaption,
    fontFamily: font.familyMono,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingSnug,
  },
});
