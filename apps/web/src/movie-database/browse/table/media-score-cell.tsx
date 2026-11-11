"use client";

import { Text } from "@tuja/ui/components/text";
import { MediaMeter } from "./media-meter";
import { useMediaTable } from "./media-table-context";
import { toPercent } from "./to-percent";
import type { MediaCellParams } from "./types";

/** Rating out of 10 above which a score reads as "good". */
const SCORE_GOOD = 7;
/** Rating below which a score reads as "poor". */
const SCORE_POOR = 5;

export function MediaScoreCell({ api, row, column }: MediaCellParams) {
  const { rating } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const score = row.data.rating;
  if (typeof score !== "number" || score <= 0) {
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );
  }

  return (
    <MediaMeter
      percent={toPercent(score, 10)}
      label={column.name ?? column.id}
      intent={
        score >= SCORE_GOOD
          ? "success"
          : score < SCORE_POOR
            ? "destructive"
            : undefined
      }
    >
      <Text as="span" look="label" weight="semibold" numeric>
        {rating.format(score)}
      </Text>
    </MediaMeter>
  );
}
