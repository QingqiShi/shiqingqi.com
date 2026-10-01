"use client";

import { cellShared } from "./cell-shared.stylex";
import { useMediaTable } from "./media-table-context";
import type { MediaCellParams } from "./types";

export function MediaVotesCell({ api, row }: MediaCellParams) {
  const { compact } = useMediaTable();

  if (!api.rowIsLeaf(row)) return null;
  const votes = row.data.voteCount;
  if (typeof votes !== "number") return <span css={cellShared.empty}>—</span>;

  return <span css={cellShared.numeric}>{compact.format(votes)}</span>;
}
