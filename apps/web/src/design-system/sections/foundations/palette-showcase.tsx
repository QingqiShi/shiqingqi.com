import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import {
  type SystemHuePalette,
  SYSTEM_PALETTE_TONES,
  systemPalette,
} from "@tuja/ui/palette-table";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { gridlineTokens } from "#src/design-system/gridline-ground.stylex.ts";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

// In a narrow sheet, only these Tones keep a label. The other columns are too
// narrow to hold one.
const KEY_TONES: ReadonlySet<number> = new Set([0, 20, 40, 60, 80, 100]);

export function PaletteShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Take any other colour from the palette.",
        zh: "其他颜色从调色板中取。",
      })}
      lead={t({
        en: "A brand colour or a chart series has no token, so take a Tone from the palette rather than writing a hex. A Tone has the same lightness in every Hue: read down a column.",
        zh: "品牌色或图表中的一组数据没有对应的令牌，请从调色板中取一个色调，而不是手写十六进制值。同一色调在每种色相中明度相同：沿任一列向下看即可。",
      })}
    >
      <div css={[stack.tight, styles.sheet]}>
        <div aria-hidden css={cluster.tight}>
          <span css={styles.name} />
          <div
            css={[
              styles.rampWidth,
              styles.columns,
              styles.columnCount(SYSTEM_PALETTE_TONES.length),
              styles.toneLabels,
            ]}
          >
            {SYSTEM_PALETTE_TONES.map((tone) => (
              <span
                key={tone}
                css={[
                  typeRole.caption,
                  typeModifier.numeric,
                  styles.toneLabel,
                  !KEY_TONES.has(tone) && styles.minorToneLabel,
                  tone === 100 && styles.lastToneLabel,
                ]}
              >
                {tone}
              </span>
            ))}
          </div>
        </div>
        <ul css={styles.list}>
          {systemPalette.map((palette) => (
            <PaletteRow key={palette.name} palette={palette} />
          ))}
        </ul>
      </div>
      <UsageSnippet
        code={`// brand.stylex.ts
import * as stylex from "@stylexjs/stylex";
import { cyan } from "@tuja/ui/palette/cyan.stylex";

export const brand = stylex.defineVars({
  partner: \`light-dark(\${cyan._40}, \${cyan._70})\`,
});`}
      />
      <GuideNote>
        {t({
          en: "A Tone is the same in both themes, so pair a light one with a dark one, as above.",
          zh: "色调在两种主题下都一样，请像上面这样把浅色与深色配成一对。",
        })}
      </GuideNote>
      <GuideNote>
        {t({
          en: "A Tone has no contrast floor, so use a token wherever one fits.",
          zh: "色调没有对比度下限，只要有合适的令牌，就用令牌。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

function PaletteRow({ palette }: { palette: SystemHuePalette }) {
  return (
    // The label wraps above the ramp when space runs out, so the ramp keeps a
    // usable width.
    <li css={cluster.tight}>
      <span css={[typeRole.label, styles.name, styles.code]}>
        {palette.name.toLowerCase()}
      </span>
      <div
        css={[
          corner.radius_2,
          styles.rampWidth,
          styles.columns,
          styles.columnCount(SYSTEM_PALETTE_TONES.length),
          styles.ramp,
        ]}
        role="img"
        aria-label={palette.name.toLowerCase()}
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
    gap: rhythm.inline,
  },
  // The tone labels hide by container width, so the sheet is the container.
  sheet: {
    containerType: "inline-size",
  },
  // Fixed width so every ramp starts at the same edge, whatever the name.
  name: {
    flexShrink: 0,
    inlineSize: "4.5rem",
    fontWeight: font.weight_6,
    color: color.fg,
  },
  code: {
    fontFamily: font.familyMono,
  },
  rampWidth: {
    flex: "1",
    minInlineSize: "220px",
  },
  // The labels and the ramps share the columns and the gridline gap, so each
  // label sits over its Tone.
  columns: {
    display: "grid",
    gap: gridlineTokens.width,
  },
  columnCount: (count: number) => ({
    gridTemplateColumns: `repeat(${count.toString()}, minmax(0, 1fr))`,
  }),
  toneLabels: {
    paddingInline: gridlineTokens.width,
  },
  toneLabel: {
    display: "flex",
    justifyContent: "center",
    minInlineSize: 0,
    whiteSpace: "nowrap",
    color: color.fgMuted,
  },
  lastToneLabel: {
    justifyContent: {
      default: "flex-end",
      "@container (min-width: 48rem)": "center",
    },
  },
  minorToneLabel: {
    visibility: {
      default: "hidden",
      "@container (min-width: 48rem)": "visible",
    },
  },
  ramp: {
    blockSize: space._4,
    boxSizing: "border-box",
    backgroundColor: color.bgCanvas,
    borderWidth: gridlineTokens.width,
    borderStyle: "solid",
    borderColor: color.border,
    overflow: "hidden",
  },
  tone: {
    minInlineSize: 0,
  },
  toneColor: (backgroundColor: string) => ({
    backgroundColor,
  }),
});
