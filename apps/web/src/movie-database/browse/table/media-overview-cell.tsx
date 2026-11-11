"use client";

import { Text } from "@tuja/ui/components/text";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import type { MediaCellParams } from "./types";

export function MediaOverviewCell({ api, row }: MediaCellParams) {
  if (!api.rowIsLeaf(row)) return null;
  const overview = row.data.overview;
  if (!overview)
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );

  return (
    <span css={truncate.base} title={overview}>
      <Text as="span" look="bodySmall" tone="muted">
        {overview}
      </Text>
    </span>
  );
}
