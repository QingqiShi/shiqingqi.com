"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Text } from "@tuja/ui/components/text";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams } from "./types";

export function MediaGenresCell({ api, row }: MediaCellParams) {
  const { genreNames } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const names = (row.data.genreIds ?? [])
    .map((id) => genreNames.get(id))
    .filter((name) => name !== undefined);

  if (!names.length)
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );

  const shown = names.slice(0, 2);
  const overflow = names.length - shown.length;

  return (
    <div css={styles.chipRow} title={names.join(", ")}>
      {shown.map((name) => (
        <Badge key={name} intent="primary" size="sm" css={styles.chip}>
          <span css={truncate.base}>{name}</span>
        </Badge>
      ))}
      {overflow > 0 && (
        <Text as="span" look="caption" weight="semibold" tone="muted">
          +{overflow}
        </Text>
      )}
    </div>
  );
}

const styles = stylex.create({
  chipRow: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
  },
  chip: {
    maxInlineSize: "8rem",
  },
});
