"use client";

import { Text } from "@tuja/ui/components/text";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams } from "./types";

export function MediaReleaseDateCell({ api, row }: MediaCellParams) {
  const { date } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const iso = row.data.releaseDate;
  if (!iso)
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );

  // TMDB dates are plain calendar days. Parsing them as UTC and formatting in
  // UTC keeps a January 1st release from slipping to December 31st for anyone
  // west of Greenwich.
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );
  }

  return (
    <Text as="span" look="bodySmall" tone="muted" numeric>
      {date.format(parsed)}
    </Text>
  );
}
