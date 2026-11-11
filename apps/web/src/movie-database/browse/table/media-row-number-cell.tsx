"use client";

import { Text } from "@tuja/ui/components/text";
import type { MediaCellParams } from "./types";

/** Row number in the current (possibly sorted) view. */
export function MediaRowNumberCell({ rowIndex }: MediaCellParams) {
  return (
    <Text as="span" look="caption" tone="muted" numeric>
      {rowIndex + 1}
    </Text>
  );
}
