import { useRef, useState, type RefCallback, type RefObject } from "react";
import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { SHEET_EDGE_BAND } from "./sheet-edge-band.ts";
import type { EffectStage } from "./types.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const SHEET_EDGE = roleBits(["sheetEdge"]);

/**
 * What `useSheetEdge` returns: the ref for the element that carries the
 * Sheet, and the refs for the two `<canvas>` elements it renders inside
 * that element, `underRef` before the card and `overRef` after it.
 */
export interface SheetEdgeRefs {
  readonly ref: RefCallback<Element> | null;
  readonly underRef: RefObject<HTMLCanvasElement | null>;
  readonly overRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Draws the top edge of a Sheet as a water surface on the effect layer
 * while the Sheet moves, as the `edge` prop of the Sheet describes. Attach
 * `ref` to the element that moves with the card and holds it, render the
 * two `<canvas>` elements inside that element with `underRef` before the
 * card and `overRef` after it, and mark the card with `data-sheet-surface`. The
 * element is an Effect stage: the `<canvas>` element under the card draws
 * the edge in the card's colour, read from the card, and the one over it
 * draws the effects of the elements inside the Sheet, so they show over
 * the card and move with it. While the effect draws, the card has the
 * `data-effect-drawn` attribute, so the card starts its own fill below the
 * band then and at no other time. With `enabled` false, outside an
 * `EffectLayerProvider`, or where the effect layer is off, the refs do
 * nothing and the Sheet keeps its plain edge.
 */
export function useSheetEdge(enabled: boolean): SheetEdgeRefs {
  const underRef = useRef<HTMLCanvasElement>(null);
  const overRef = useRef<HTMLCanvasElement>(null);
  const [stage] = useState<EffectStage>(() => ({
    canvases: () => ({ under: underRef.current, over: overRef.current }),
    band: SHEET_EDGE_BAND,
  }));
  const ref = useEffectRegistration(
    SHEET_EDGE,
    NO_SETTINGS,
    null,
    false,
    stage,
  );
  return { ref: enabled ? ref : null, underRef, overRef };
}
