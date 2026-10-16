import { sheetEdge } from "./sheet-edge.stylex.ts";
import type { StageBand } from "./types.ts";

const px = (value: string) => Number.parseFloat(value);

/**
 * The band the Sheet edge draws in, as `sheetEdge` sets it, in CSS px.
 *
 * @internal
 */
export const SHEET_EDGE_BAND: StageBand = {
  rise: px(sheetEdge.rise),
  depth: px(sheetEdge.depth),
  spill: px(sheetEdge.spill),
};

/**
 * Marks the surface of a Sheet, the card, inside the element that carries
 * the Sheet edge: the effect reads the card's colour and corners from it,
 * and marks it with `data-effect-drawn` while it draws the edge.
 *
 * @internal
 */
export const SHEET_SURFACE = "data-sheet-surface";
