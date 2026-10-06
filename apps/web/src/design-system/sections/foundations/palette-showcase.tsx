import * as stylex from "@stylexjs/stylex";
import {
  type SystemHuePalette,
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "@tuja/ui/palette-table";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

// Cell widths taper smoothly from a wide centre to narrow ends, so each ramp
// reads like a lens over its mid-tones. Raising the sine to the fourth power
// concentrates the width into a sharp central peak — the mid tones dominate and
// the taper accelerates towards the ends — while the 0.18fr floor keeps the
// outermost cells legible. Applied inline because the varying template is not a
// static value StyleX can inline. Every ramp shares the same 21-tone shape,
// computed once.
const RAMP_COLUMNS = SYSTEM_PALETTE_TONES.map((_tone, index) => {
  const position = index / (SYSTEM_PALETTE_TONES.length - 1);
  const width = 0.18 + 2.8 * Math.sin(Math.PI * position) ** 4;
  return `${width.toFixed(3)}fr`;
}).join(" ");

/**
 * The system palette as a quiet reference sheet: one row per hue, each a label
 * and its full ramp. It is the range the tokens draw from, not something to
 * style against.
 */
export function PaletteShowcase() {
  return (
    <GuideSection
      title={t({
        en: "A colour no token covers",
        zh: "令牌未涵盖的颜色",
      })}
      lead={t({
        en: "A brand's own colour or a series in a chart has no Token Role. Take it from the system palette rather than writing a hex: thirteen Hues, each at twenty-one Tones from 0, black, to 100, white. Where a Token Role fits, use the token instead, because a Tone does not follow the scheme and holds no contrast floor.",
        zh: "品牌自身的颜色或图表中的一组数据，没有对应的令牌角色。请从系统调色板中取色，而不是手写十六进制值：十三种色相，各有从 0（黑）到 100（白）的二十一级色调。只要有合适的令牌角色，就改用令牌，因为色调不会跟随配色方案，也没有对比度下限。",
      })}
    >
      <GuideList
        items={[
          {
            term: "@tuja/ui/palette/<hue>.stylex",
            value: t({ en: "One Hue's Tones", zh: "一种色相的全部色调" }),
            note: t({
              en: "StyleX constants such as cyan._40, each one fixed hex. cyan_rgb._40 holds the same Tone as channels, for an rgba() with an alpha of your own.",
              zh: "StyleX 常量，例如 cyan._40，每个都是一个固定的十六进制值。cyan_rgb._40 以通道形式给出同一色调，用于自定透明度的 rgba()。",
            }),
          },
          {
            term: t({ en: "Pair two Tones", zh: "配对两个色调" }),
            value: "light-dark()",
            note: t({
              en: "A Tone is the same in both schemes. Pair a light Tone with a dark one in a var of your own, in a .stylex.ts file, so the colour follows the scheme the way a token does.",
              zh: "色调在两种配色方案下都一样。请在你自己的 .stylex.ts 文件中，把一个浅色色调与一个深色色调配对成一个变量，使这个颜色像令牌一样跟随配色方案。",
            }),
          },
          {
            term: t({
              en: "Same Tone, same lightness",
              zh: "同一色调，同一明度",
            }),
            value: t({ en: "Across every Hue", zh: "跨所有色相" }),
            note: t({
              en: "Each Hue is generated so that a Tone looks as bright as gray at the same number. Pick the Tone for the lightness you need, then change the Hue and keep the Tone. Every Intent fill sits at Tone 40 in light and 70 in dark.",
              zh: "每种色相在生成时都让每一级色调看起来与灰色同一编号一样亮。先按所需的明度选色调，再更换色相，色调保持不变。所有意图色填充都位于浅色下的色调 40 与深色下的色调 70。",
            }),
          },
          {
            term: "@tuja/ui/palette-table",
            value: t({ en: "The Tones as data", zh: "以数据形式给出的色调" }),
            note: t({
              en: "systemPalette lists every Hue and Tone with a black or white foreground, for tooling such as a swatch picker. That foreground is whichever has the higher WCAG 2 ratio, not a Token pairing with a floor.",
              zh: "systemPalette 列出每种色相与色调，并为每一格给出黑色或白色前景，用于色板选择器之类的工具。这个前景只是 WCAG 2 对比度更高的那一个，并不是有下限保障的令牌搭配。",
            }),
          },
        ]}
      />
      <UsageSnippet
        code={`// brand.stylex.ts
import * as stylex from "@stylexjs/stylex";
import { cyan } from "@tuja/ui/palette/cyan.stylex";

export const brand = stylex.defineVars({
  partner: \`light-dark(\${cyan._40}, \${cyan._70})\`,
});`}
      />
      <Showcase frame="plain" breakout>
        <ul css={styles.list}>
          {systemPalette.map((palette) => (
            <PaletteRow key={palette.name} palette={palette} />
          ))}
        </ul>
      </Showcase>
    </GuideSection>
  );
}

function PaletteRow({ palette }: { palette: SystemHuePalette }) {
  return (
    <li css={styles.row}>
      <span css={styles.name}>{palette.name}</span>
      <div
        css={[corner.radius_2, styles.ramp, styles.rampColumns(RAMP_COLUMNS)]}
        role="img"
        aria-label={palette.name}
      >
        {SYSTEM_PALETTE_TONES.map((tone) => (
          <span
            key={tone}
            css={[styles.tone, styles.toneColor(palette.tones[tone].bg)]}
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
  // Fixed width so every ramp starts at the same edge, whatever the name.
  name: {
    flexShrink: 0,
    inlineSize: "4.5rem",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.fg,
    letterSpacing: font.trackingTight,
  },
  ramp: {
    flex: "1",
    minInlineSize: "220px",
    display: "grid",
    // Columns are supplied inline (RAMP_COLUMNS) to taper the cell widths.
    gap: border.size_1,
    blockSize: "26px",
    boxSizing: "border-box",
    backgroundColor: color.bgCanvas,
    borderWidth: space._00,
    borderStyle: "solid",
    borderColor: color.border,
    overflow: "hidden",
  },
  rampColumns: (columns: string) => ({
    gridTemplateColumns: columns,
  }),
  tone: {
    minInlineSize: 0,
  },
  toneColor: (backgroundColor: string) => ({
    backgroundColor,
  }),
});
