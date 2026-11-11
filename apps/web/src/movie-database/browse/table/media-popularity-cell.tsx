"use client";

import { Text } from "@tuja/ui/components/text";
import { MediaMeter } from "./media-meter";
import { useMediaTable } from "./media-table-context";
import { toPercent } from "./to-percent";
import type { MediaCellParams } from "./types";

export function MediaPopularityCell({ api, row, column }: MediaCellParams) {
  const { compact, maxPopularity } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const popularity = row.data.popularity;
  if (typeof popularity !== "number")
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );

  return (
    <MediaMeter
      percent={toPercent(popularity, maxPopularity)}
      label={column.name ?? column.id}
    >
      <Text as="span" look="bodySmall" tone="muted" numeric>
        {compact.format(popularity)}
      </Text>
    </MediaMeter>
  );
}
