import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { Fragment } from "react";
import { definitionRows } from "#src/design-system/definition-rows.stylex.ts";
import { measure } from "#src/design-system/measure.stylex.ts";

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
    <dl css={[definitionRows.list, styles.list]}>
      {items.map((item) => (
        <div key={item.term} css={[definitionRows.row, styles.row]}>
          <dt css={styles.term}>{breakAfterSlashes(item.term)}</dt>
          <dd css={[stack.tight, definitionRows.definition]}>
            {item.value ? <span css={styles.value}>{item.value}</span> : null}
            <span css={styles.note}>{item.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function breakAfterSlashes(term: string) {
  const parts = term.split("/");
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? (
        <>
          /<wbr />
        </>
      ) : null}
    </Fragment>
  ));
}

const styles = stylex.create({
  // Queries itself rather than the viewport: this sits in a column beside a
  // sidebar, so the space a row actually gets does not track the screen width.
  list: {
    containerType: "inline-size",
  },
  row: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 38rem)": "13rem minmax(0, 1fr)",
    },
    columnGap: rhythm.item,
  },
  term: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    color: color.fg,
    textWrap: "balance",
    overflowWrap: "anywhere",
  },
  value: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    lineHeight: font.lineHeight_3,
    color: color.fg,
  },
  note: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.fgMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
});
