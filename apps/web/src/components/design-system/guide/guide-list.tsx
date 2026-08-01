import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { measure } from "../measure.stylex.ts";

interface GuideListItem {
  term: string;
  /** The limit or shorthand answer, when the row has one. */
  value?: string;
  note: string;
}

interface GuideListProps {
  items: GuideListItem[];
}

/**
 * Term / answer / reason rows. For the parts of a guideline that are genuinely
 * tabular — a limit per component, a rule per state — where cards would spend a
 * whole surface on two lines of text.
 */
export function GuideList({ items }: GuideListProps) {
  return (
    <dl css={styles.list}>
      {items.map((item) => (
        <div key={item.term} css={styles.row}>
          <dt css={styles.term}>{item.term}</dt>
          <dd css={styles.definition}>
            {item.value ? <span css={styles.value}>{item.value}</span> : null}
            <span css={styles.note}>{item.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const styles = stylex.create({
  // Queries itself rather than the viewport: this sits in a column beside a
  // sidebar, so the space a row actually gets does not track the screen width.
  list: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    containerType: "inline-size",
  },
  // The only rule left on these pages, and it separates rows rather than
  // topping them, so the run reads as one list.
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 38rem)": "13rem minmax(0, 1fr)",
    },
    gap: {
      default: space._0,
      "@container (min-width: 38rem)": space._4,
    },
    paddingBlock: space._3,
    borderBlockStartWidth: { default: 0, ":not(:first-child)": border.size_1 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    minInlineSize: 0,
  },
  term: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    color: color.textMain,
    textWrap: "balance",
  },
  definition: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    margin: 0,
    minInlineSize: 0,
  },
  value: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    color: color.textMain,
  },
  note: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
