import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";

interface WeightCell {
  token: keyof typeof weightStyles;
  /** The `weight` prop of Text or Heading that sets this weight. */
  prop?: string;
}

const REGULAR_FACE: readonly WeightCell[] = [
  { token: "weight_1" },
  { token: "weight_2" },
  { token: "weight_3" },
  { token: "weight_4", prop: "regular" },
  { token: "weight_5", prop: "medium" },
];

const SEMIBOLD_FACE: readonly WeightCell[] = [
  { token: "weight_6", prop: "semibold" },
  { token: "weight_7", prop: "bold" },
  { token: "weight_8", prop: "extrabold" },
  { token: "weight_9", prop: "black" },
];

function WeightFace({
  name,
  cells,
}: {
  name: string;
  cells: readonly WeightCell[];
}) {
  return (
    <figure css={[stack.tight, styles.face]}>
      <figcaption css={[typeRole.label, styles.faceName]}>{name}</figcaption>
      <ol css={styles.weights}>
        {cells.map(({ token, prop }) => (
          <li key={token} css={[stack.tight, styles.weight]}>
            <span
              aria-hidden="true"
              css={[typeRole.subDisplay, styles.glyph, weightStyles[token]]}
            >
              Ag
            </span>
            <span css={stack.text}>
              <span css={[typeRole.caption, typeModifier.numeric, styles.mono]}>
                {token}
              </span>
              <span css={[typeRole.caption, styles.mono, styles.prop]}>
                {prop ?? " "}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** The two families, and the two faces of Haffer that every weight lands on. */
export function FamiliesShowcase() {
  return (
    <GuideSection
      title={t({
        en: "Pick regular or semibold.",
        zh: "选择 regular 或 semibold。",
      })}
      lead={t({
        en: "Haffer, the interface face, has only Regular and SemiBold, so every weight token draws one of the two. Code is set in IBM Plex Mono.",
        zh: "界面字体 Haffer 只有 Regular 与 SemiBold，因此每个字重令牌都显示为其中之一。代码使用 IBM Plex Mono。",
      })}
    >
      <div css={styles.faces}>
        <WeightFace name="Regular · 400" cells={REGULAR_FACE} />
        <WeightFace name="SemiBold · 600" cells={SEMIBOLD_FACE} />
      </div>
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "In Latin text, medium looks like regular, and bold like semibold.",
            zh: "在拉丁文字中，medium 与 regular 相同，bold 与 semibold 相同。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Chinese text takes the platform's font, with that font's own weights.",
            zh: "中文使用平台自带的字体，字重也由该字体决定。",
          })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}

const weightStyles = stylex.create({
  weight_1: { fontWeight: font.weight_1 },
  weight_2: { fontWeight: font.weight_2 },
  weight_3: { fontWeight: font.weight_3 },
  weight_4: { fontWeight: font.weight_4 },
  weight_5: { fontWeight: font.weight_5 },
  weight_6: { fontWeight: font.weight_6 },
  weight_7: { fontWeight: font.weight_7 },
  weight_8: { fontWeight: font.weight_8 },
  weight_9: { fontWeight: font.weight_9 },
});

const styles = stylex.create({
  faces: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.group,
  },
  face: {
    margin: 0,
    minInlineSize: 0,
  },
  faceName: {
    color: color.fg,
    fontWeight: font.weight_6,
  },
  weights: {
    display: "flex",
    flexWrap: "wrap",
    columnGap: rhythm.tight,
    rowGap: rhythm.item,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  weight: {
    minInlineSize: "3.5rem",
  },
  glyph: {
    color: color.fg,
  },
  mono: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  prop: {
    color: color.fg,
  },
});
