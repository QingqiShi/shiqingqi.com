"use client";

import { Text } from "@tuja/ui/components/text";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams } from "./types";

export function MediaVotesCell({ api, row }: MediaCellParams) {
  const { compact } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const votes = row.data.voteCount;
  if (typeof votes !== "number")
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );

  return (
    <Text as="span" look="bodySmall" tone="muted" numeric>
      {compact.format(votes)}
    </Text>
  );
}
