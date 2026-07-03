import * as stylex from "@stylexjs/stylex";
import {
  type SystemHuePalette,
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "@tuja/ui/palette-table";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

// Cell widths taper smoothly from a wide centre to narrow ends, so each ramp
// reads like a lens over its mid-tones. Raising the sine to the fourth power
// concentrates the width into a sharp central peak — the mid tones dominate and
// the taper accelerates toward the ends — while the 0.18fr floor keeps the
// outermost cells legible. Applied inline because the varying template is not a
// static value StyleX can inline. Every ramp shares the same 21-tone shape,
// computed once.
const RAMP_COLUMNS = SYSTEM_PALETTE_TONES.map((_tone, index) => {
  const position = index / (SYSTEM_PALETTE_TONES.length - 1);
  const width = 0.18 + 2.8 * Math.sin(Math.PI * position) ** 4;
  return `${width.toFixed(3)}fr`;
}).join(" ");

/**
 * The system palette, shown as a plain reference sheet: one row per hue, each a
 * label and its full tonal ramp. It is intentionally quiet — this is the raw
 * range the tokens draw from, not something the app styles against directly — so
 * the surfaces and roles below carry the visual weight.
 */
export function PaletteShowcase() {
  return (
    <Showcase
      label={t({ en: "System palette", zh: "系统调色板" })}
      frame="plain"
    >
      <ShowcaseHelper>
        {t({
          en: "Thirteen hues, each expanded into a perceptually even 21-step tonal scale. The complete range of available colour — consumed only through the design tokens above.",
          zh: "十三种色相，各自展开为感知均匀的 21 级色调阶梯。全部可用颜色的范围——仅通过上方的设计令牌使用。",
        })}
      </ShowcaseHelper>
      <ul css={styles.list}>
        {systemPalette.map((palette) => (
          <PaletteRow key={palette.name} palette={palette} />
        ))}
      </ul>
    </Showcase>
  );
}

function PaletteRow({ palette }: { palette: SystemHuePalette }) {
  return (
    <li css={styles.row}>
      <div css={styles.identity}>
        <span css={styles.name}>{palette.name}</span>
        <span css={styles.source}>{palette.source}</span>
      </div>
      <div
        css={styles.ramp}
        style={{ gridTemplateColumns: RAMP_COLUMNS }}
        role="img"
        aria-label={palette.name}
      >
        {SYSTEM_PALETTE_TONES.map((tone) => (
          <span
            key={tone}
            css={styles.tone}
            style={{ backgroundColor: palette.tones[tone].bg }}
          />
        ))}
      </div>
    </li>
  );
}

const styles = stylex.create({
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  // Label sits beside the ramp on wide rows and wraps above it when space runs
  // out, so the ramp always keeps a usable width.
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space._4,
    rowGap: space._1,
  },
  identity: {
    flexShrink: 0,
    inlineSize: "6.5rem",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space._2,
  },
  name: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMain,
    letterSpacing: font.trackingTight,
  },
  source: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  ramp: {
    flex: "1",
    minInlineSize: "220px",
    display: "grid",
    // Columns are supplied inline (RAMP_COLUMNS) to taper the cell widths.
    blockSize: "26px",
    borderRadius: border.radius_2,
    overflow: "hidden",
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  tone: {
    minInlineSize: 0,
  },
});
