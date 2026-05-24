import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import {
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "#src/_generated/system-palette.ts";
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
            <div
              key={palette.name}
              css={styles.card}
              role="group"
              aria-label={palette.name}
            >
              <div css={styles.header}>
                <span css={styles.name}>{palette.name}</span>
                <span css={styles.source}>{palette.source}</span>
              </div>
              <div css={styles.tones}>
                {SYSTEM_PALETTE_TONES.map((tone) => {
                  const swatch = palette.tones[tone];
                  const featured = FEATURED_TONES.has(tone);
                  return (
                    <div
                      key={tone}
                      css={[
                        styles.tone,
                        featured ? styles.toneFeatured : styles.toneRegular,
                      ]}
                      style={{
                        backgroundColor: swatch.bg,
                        color: swatch.fg,
                      }}
                      aria-label={`${palette.name} ${String(tone)}`}
                    >
                      <span css={styles.toneNumber}>{tone}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Showcase>
    </Section>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space._3,
  },
  name: {
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  source: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  tones: {
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
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  tone: {
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
  toneRegular: {
    minBlockSize: "44px",
  },
  toneFeatured: {
    minBlockSize: "80px",
  },
  toneNumber: {
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
