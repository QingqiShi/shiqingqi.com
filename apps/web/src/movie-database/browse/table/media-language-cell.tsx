"use client";

import { Text } from "@tuja/ui/components/text";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import type { MediaCellParams } from "./types";

export function MediaLanguageCell({ api, column, row }: MediaCellParams) {
  const value = api.columnField(column, row);
  if (typeof value !== "string" || !value) {
    return (
      <Text as="span" look="bodySmall" tone="muted">
        —
      </Text>
    );
  }
  return (
    <Text as="span" look="bodySmall" tone="muted" css={truncate.base}>
      {value}
    </Text>
  );
}
