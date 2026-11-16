"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { Text } from "@tuja/ui/components/text";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import type { Day } from "#src/trips/types.ts";
import { highlightIcon } from "../day-glance.tsx";
import { dayHighlights } from "../day-highlights.ts";
import { TripText } from "../trip-text.tsx";
import { Glyph } from "./glyph.tsx";

/** The first fixed commitments of the day, one line each. */
export function HighlightLines({ day, limit }: { day: Day; limit: number }) {
  // The stay band shows where the night is, so the check-in and the
  // check-out give their lines to the rest of the day.
  const highlights = dayHighlights(day)
    .filter(({ kind }) => kind !== "checkin" && kind !== "checkout")
    .slice(0, limit);
  if (highlights.length === 0) return null;
  return (
    <ul css={stack.rows}>
      {highlights.map((highlight) => (
        <li key={highlight.momentId} css={[row.inline, styles.highlight]}>
          <Glyph size="bodySmall">{highlightIcon[highlight.kind]}</Glyph>
          <Text as="span" look="caption" css={truncate.base}>
            <TripText>{highlight.label}</TripText>
          </Text>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  highlight: { minWidth: 0, color: color.mutedForeground },
});
