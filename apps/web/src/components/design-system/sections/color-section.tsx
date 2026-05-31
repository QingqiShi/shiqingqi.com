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

// Column counts per breakpoint — keep in sync with styles.grid.
const GRID_COLUMNS = { md: 2, lg: 3 };

// When the hue count leaves a single card alone on the final row, center it
// rather than stranding it flush-left: full width in the 2-col grid, the middle
// column in the 3-col grid. Gating each breakpoint on `count % cols === 1` means
// the override disappears cleanly when the count is a multiple of that column
// count (no stray-span collision), and it keeps working as hues are added.
function orphanColumnVars(count: number) {
  const center = (cols: number) =>
    cols % 2 === 1 ? String(Math.ceil(cols / 2)) : "1 / -1";
  return {
    "--orphan-col-md":
      count % GRID_COLUMNS.md === 1 ? center(GRID_COLUMNS.md) : "auto",
    "--orphan-col-lg":
      count % GRID_COLUMNS.lg === 1 ? center(GRID_COLUMNS.lg) : "auto",
  };
}

export function ColorSection() {
  const lastIndex = systemPalette.length - 1;
  const orphanVars = orphanColumnVars(systemPalette.length);

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
        <div css={styles.grid}>
          {systemPalette.map((palette, index) => (
            <PaletteSpecimen
              key={palette.name}
              palette={palette}
              orphanVars={index === lastIndex ? orphanVars : undefined}
            />
          ))}
        </div>
      </Showcase>
    </Section>
  );
}

function PaletteSpecimen({
  palette,
  orphanVars,
}: {
  palette: SystemHuePalette;
  orphanVars?: ReturnType<typeof orphanColumnVars>;
}) {
  const solid = palette.tones[40];
  const soft = palette.tones[80];

  return (
    <article
      css={styles.card}
      role="group"
      aria-label={palette.name}
      style={{ "--source": palette.source, ...orphanVars }}
    >
      <div css={styles.wash} aria-hidden />

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
              role="img"
              aria-label={`${palette.name} ${String(tone)}`}
            />
          );
        })}
      </div>
    </article>
  );
}

const styles = stylex.create({
  // Two-up field-guide layout: specimen cards flow into a responsive grid so the
  // thirteen hues read as a compact reference sheet rather than a tall stack.
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(3, minmax(0, 1fr))",
    },
    gap: space._3,
  },
  card: {
    position: "relative",
    // A lone card on the final row reads `--orphan-col-*` (set only on that card
    // by `orphanColumnVars`) to center itself — full width at md, middle column at
    // lg. Every other card leaves the vars unset and falls back to `auto`.
    gridColumn: {
      default: "auto",
      [breakpoints.md]: "var(--orphan-col-md, auto)",
      [breakpoints.lg]: "var(--orphan-col-lg, auto)",
    },
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._4,
    backgroundColor: color.bgSurfaceRaised,
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
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space._3,
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
    display: "flex",
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
    // Compact mode unfurls all 21 tones into a single slim ramp at every width,
    // so the brightness curve reads as one gesture; featured 40/80 carry rings
    // and the Aa demo names the key stops, replacing per-cell numerals.
    gridTemplateColumns: "repeat(21, minmax(0, 1fr))",
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  tone: {
    position: "relative",
    minBlockSize: "30px",
    // Hover widens the swatch over its neighbours and lifts it above them; the
    // z-index reset is delayed so it stays on top while scaling back. A drop
    // shadow would be clipped by the ramp's `overflow: hidden`, so there is none.
    transition: "transform 220ms cubic-bezier(0.2, 0, 0, 1), z-index 0ms 220ms",
    zIndex: { default: layer.base, ":hover": layer.content },
    transform: { default: "scale(1)", ":hover": "scale(1.12)" },
  },
  toneFeatured: {
    boxShadow: "inset 0 0 0 1.5px currentColor",
  },
});
