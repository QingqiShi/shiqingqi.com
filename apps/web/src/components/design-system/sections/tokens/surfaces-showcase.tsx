import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { RampCell } from "../../ramp-cell.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

export function SurfacesShowcase() {
  return (
    <Showcase label={t({ en: "Surfaces", zh: "表面" })}>
      <ShowcaseHelper>
        {t({
          en: "Seven surface tiers and three foreground tones. Surfaces lift toward white in light mode and toward higher lightness in dark mode; the foreground stays legible across every step.",
          zh: "七个表面层级与三种前景色调。表面在浅色模式下趋近纯白，在深色模式下逐级提亮；前景在每一层级皆保持可读。",
        })}
      </ShowcaseHelper>
      <div css={styles.bento}>
        <div css={styles.surfacesRamp}>
          <RampCell
            bg={styles.fillBgDim}
            fg={styles.textOnBg}
            label={t({ en: "Dim", zh: "暗淡" })}
            token="color.backgroundDim"
            span={styles.spanDim}
          />
          <RampCell
            bg={styles.fillBg}
            fg={styles.textOnBg}
            label={t({ en: "Background", zh: "背景" })}
            token="color.background"
            span={styles.spanBg}
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
  );
}

const styles = stylex.create({
  bento: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
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
  spanBg: {
    gridColumn: {
      default: "auto",
      [breakpoints.md]: "span 3",
      [breakpoints.lg]: "auto",
    },
  },
  spanDim: {
    gridColumn: {
      default: "auto",
      [breakpoints.md]: "span 2",
      [breakpoints.lg]: "auto",
    },
  },
  fillBg: { backgroundColor: color.background },
  fillBgDim: { backgroundColor: color.backgroundDim },
  fillBg1: { backgroundColor: color.background1 },
  fillBg2: { backgroundColor: color.background2 },
  fillBg3: { backgroundColor: color.background3 },
  fillBg4: { backgroundColor: color.background4 },
  fillBg5: { backgroundColor: color.background5 },
  fillTextMain: { backgroundColor: color.textMain },
  fillTextMuted: { backgroundColor: color.textMuted },
  fillTextSubtle: { backgroundColor: color.textSubtle },
  textOnBg: { color: color.textMain },
  textOnForeground: { color: color.background },
});
