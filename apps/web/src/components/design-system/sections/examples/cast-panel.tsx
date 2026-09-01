"use client";

import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import type { Credit } from "./use-movies.ts";

/** The cast half of the Credits, as Avatar monograms — the exemplar has no portraits. */
export function CastPanel({ cast }: { cast: Credit[] }) {
  return (
    <ul css={styles.castList} aria-label={t({ en: "Cast", zh: "演员" })}>
      {cast.map((credit) => (
        <li key={credit.name} css={styles.credit}>
          <Avatar name={credit.name} size="md" />
          <span css={styles.creditText}>
            <Text as="span" variant="bodySmall" weight="medium">
              {credit.name}
            </Text>
            <Text as="span" variant="caption" tone="subtle">
              {credit.character}
            </Text>
          </span>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  // Capped, so six credits settle into two tidy rows of three rather than
  // stretching into one long line of six with an Avatar every 180px.
  castList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(10.5rem, 1fr))",
    gap: space._3,
    margin: 0,
    padding: 0,
    maxInlineSize: "36rem",
    listStyle: "none",
  },
  credit: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
  },
  creditText: {
    display: "flex",
    flexDirection: "column",
    // Both children are inline spans, so the column needs its own floor to stop
    // a long name from pushing the Avatar out of the row.
    minInlineSize: 0,
  },
});
