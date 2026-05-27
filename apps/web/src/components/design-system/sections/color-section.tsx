import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import {
  type SystemHuePalette,
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "@tuja/ui/palette-table";
import {
  border,
  color,
  font,
  layer,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Section } from "../section.tsx";
import { ShowcaseHelper } from "../showcase-helper.tsx";
import { Showcase } from "../showcase.tsx";

const FEATURED_TONES: ReadonlySet<number> = new Set([40, 80]);

export function ColorSection() {
  return (
    <Section
      id="color"
      title={t({ en: "Color", zh: "颜色" })}
      description={t({
        en: "Thirteen system hues expanded into tonal palettes via Material 3's HCT — CAM16 hue and chroma with CIE L* tones — so lightness steps stay perceptually even and chroma peaks where the sRGB gamut allows.",
        zh: "十三种系统色调通过 Material 3 的 HCT（CAM16 色相与饱和度，CIE L* 明度）展开为色调阶梯——明度等级感知均匀，饱和度在 sRGB 色域允许处达到峰值。",
      })}
    >
      <Showcase label={t({ en: "Tonal palettes", zh: "色调阶梯" })}>
        <ShowcaseHelper>
          {t({
            en: "Tones 40 and 80 are featured as key stops — the typical pairing for solid roles and their soft surfaces.",
            zh: "40 与 80 为关键色阶——通常用作实色角色与对应柔和表面。",
          })}
        </ShowcaseHelper>
        <div css={styles.stack}>
          {systemPalette.map((palette) => (
            <PaletteSpecimen key={palette.name} palette={palette} />
          ))}
        </div>
      </Showcase>
    </Section>
  );
}

function PaletteSpecimen({ palette }: { palette: SystemHuePalette }) {
  const solid = palette.tones[40];
  const soft = palette.tones[80];

  return (
    <article
      css={styles.card}
      role="group"
      aria-label={palette.name}
      style={{ "--source": palette.source }}
    >
      <div css={styles.wash} aria-hidden />

      <div css={styles.body}>
        <header css={styles.header}>
          <div css={styles.identity}>
            <h3 css={styles.name}>{palette.name}</h3>
            <span css={styles.source}>{palette.source}</span>
          </div>

          <div css={styles.demo} aria-hidden>
            <div
              css={styles.demoSurface}
              style={{
                backgroundColor: soft.bg,
                color: `contrast-color(${soft.bg})`,
              }}
            >
              <div
                css={styles.demoChip}
                style={{
                  backgroundColor: solid.bg,
                  color: `contrast-color(${solid.bg})`,
                }}
              >
                Aa
              </div>
              <div css={styles.demoMeta}>
                <span css={styles.demoMetaPrimary}>40</span>
                <span css={styles.demoMetaDivider}>·</span>
                <span css={styles.demoMetaSecondary}>80</span>
              </div>
            </div>
          </div>
        </header>

        <div css={styles.tones}>
          {SYSTEM_PALETTE_TONES.map((tone) => {
            const swatch = palette.tones[tone];
            const featured = FEATURED_TONES.has(tone);
            return (
              <div
                key={tone}
                css={[styles.tone, featured && styles.toneFeatured]}
                style={{
                  backgroundColor: swatch.bg,
                  color: `contrast-color(${swatch.bg})`,
                }}
                aria-label={`${palette.name} ${String(tone)}`}
              >
                <span
                  css={[
                    styles.toneNumber,
                    featured && styles.toneNumberFeatured,
                  ]}
                >
                  {tone}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  card: {
    position: "relative",
    display: "flex",
    paddingBlock: space._4,
    paddingInline: space._5,
    backgroundColor: color.background2,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_3,
    overflow: "hidden",
    isolation: "isolate",
  },
  wash: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: 0,
    inlineSize: "55%",
    blockSize: "100%",
    background:
      "radial-gradient(120% 140% at 100% 0%, var(--source) 0%, transparent 55%)",
    opacity: 0.12,
    pointerEvents: "none",
    zIndex: layer.background,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    flexGrow: 1,
    minInlineSize: 0,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space._4,
  },
  identity: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
  },
  name: {
    margin: 0,
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
  },
  source: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    letterSpacing: font.trackingWide,
  },
  demo: {
    flexShrink: 0,
    display: {
      default: "none",
      [breakpoints.md]: "flex",
    },
  },
  demoSurface: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    boxShadow: shadow._1,
  },
  demoChip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "28px",
    blockSize: "28px",
    borderRadius: border.radius_round,
    fontFamily: font.family,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingTight,
  },
  demoMeta: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWider,
  },
  demoMetaPrimary: {
    opacity: 0.95,
  },
  demoMetaSecondary: {
    opacity: 0.55,
  },
  demoMetaDivider: {
    opacity: 0.4,
  },
  tones: {
    display: "grid",
    // 21 tones factor cleanly as 7×3 or 21×1. Mobile/tablet keep a 7-column
    // bento so every cell fits; lg+ unfurls into a single 21-cell ramp so the
    // brightness curve reads as one gesture.
    gridTemplateColumns: {
      default: "repeat(7, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(21, minmax(0, 1fr))",
    },
    minBlockSize: "60px",
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  tone: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minBlockSize: "44px",
    transition:
      "transform 220ms cubic-bezier(0.2, 0, 0, 1), box-shadow 220ms ease, z-index 0ms 220ms",
    zIndex: { default: layer.base, ":hover": layer.content },
    transform: { default: "scale(1)", ":hover": "scale(1.08)" },
    boxShadow: {
      default: "none",
      ":hover": `0 1px 2px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.18)`,
    },
  },
  toneFeatured: {
    boxShadow: {
      default: "inset 0 0 0 1.5px currentColor",
      ":hover": `inset 0 0 0 1.5px currentColor, 0 1px 2px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.18)`,
    },
  },
  toneNumber: {
    display: {
      default: "none",
      [breakpoints.md]: "block",
    },
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingSnug,
    opacity: 0.85,
  },
  toneNumberFeatured: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_8,
    letterSpacing: font.trackingTight,
    opacity: 1,
  },
});
