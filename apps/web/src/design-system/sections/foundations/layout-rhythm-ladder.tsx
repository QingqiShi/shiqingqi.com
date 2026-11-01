import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";

interface RhythmStep {
  term: string;
  value: string;
  relation: string;
  gap: StyleXStyles;
}

/** The five rhythm steps, each drawn at its true gap, with the relation it names. */
export function LayoutRhythmLadder() {
  const steps: RhythmStep[] = [
    {
      term: "inline",
      value: "4px",
      relation: t({ en: "Parts of one unit", zh: "同一单元的各部分" }),
      gap: styles.inline,
    },
    {
      term: "tight",
      value: "8px",
      relation: t({ en: "Boxes in one item", zh: "一项之内的盒子" }),
      gap: styles.tight,
    },
    {
      term: "item",
      value: "16px",
      relation: t({ en: "Siblings in a group", zh: "一组中的同级" }),
      gap: styles.item,
    },
    {
      term: "group",
      value: "32px",
      relation: t({ en: "Between groups", zh: "组与组之间" }),
      gap: styles.group,
    },
    {
      term: "section",
      value: t({ en: "48px · 64px from md", zh: "48px · md 起 64px" }),
      relation: t({ en: "Between sections", zh: "区块与区块之间" }),
      gap: styles.section,
    },
  ];

  return (
    // Safari drops the list role from a list without markers.
    <ol role="list" css={styles.ladder}>
      {steps.map((step) => (
        <li key={step.term} css={stack.tight}>
          <span aria-hidden="true" css={[styles.pair, step.gap]}>
            <span css={styles.bar} />
            <span css={styles.bar} />
          </span>
          <span css={stack.text}>
            <code css={[typeRole.label, styles.term]}>
              {`rhythm.${step.term}`}
            </code>
            <span css={[typeRole.caption, typeModifier.numeric, styles.muted]}>
              {step.value}
            </span>
            <span css={[typeRole.caption, styles.muted]}>{step.relation}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const styles = stylex.create({
  ladder: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))",
    alignItems: "end",
    gap: rhythm.item,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  pair: {
    display: "flex",
  },
  bar: {
    inlineSize: space._0,
    blockSize: space._8,
    backgroundColor: color.fgMuted,
  },
  term: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  muted: {
    color: color.fgMuted,
  },
  inline: { gap: rhythm.inline },
  tight: { gap: rhythm.tight },
  item: { gap: rhythm.item },
  group: { gap: rhythm.group },
  section: { gap: rhythm.section },
});
