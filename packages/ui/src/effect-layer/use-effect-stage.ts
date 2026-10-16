import { useRef, useState, type RefCallback, type RefObject } from "react";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import type { EffectStage, StageBand } from "./types.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

/**
 * What `useEffectStage` returns: the ref for the element that is the
 * stage, and the ref for the `<canvas>` element it renders inside that
 * element, after its content.
 */
export interface EffectStageRefs {
  readonly ref: RefCallback<Element> | null;
  readonly overRef: RefObject<HTMLCanvasElement | null>;
}

const NO_REACH: StageBand = { rise: 0, depth: 0, spill: 0 };

/**
 * Makes an element an Effect stage: attach `ref` to an element that moves
 * with its content, such as the box that carries a Sheet's card, and
 * render a `<canvas>` element inside it after the content with `overRef`.
 * The effects of the elements inside the stage draw on that `<canvas>`
 * element, so they show over the stage's content and move with it on the
 * compositor, never a frame behind. The `<canvas>` element covers the
 * stage, and `reach` more above it, past each side and below it, in CSS
 * px, for an effect that goes past the stage's edge; place the element
 * that far up and out. With `enabled` false, outside an `EffectLayerProvider`, or
 * where the effect layer is off, the refs do nothing.
 */
export function useEffectStage(
  enabled: boolean,
  reach: Pick<StageBand, "rise" | "spill" | "fall"> = NO_REACH,
): EffectStageRefs {
  const overRef = useRef<HTMLCanvasElement>(null);
  const [stage] = useState<EffectStage>(() => ({
    canvases: () => ({ under: null, over: overRef.current }),
    band: {
      rise: reach.rise,
      spill: reach.spill,
      fall: reach.fall ?? 0,
      depth: 0,
    },
  }));
  const ref = useEffectRegistration(0, NO_SETTINGS, null, false, stage);
  return { ref: enabled ? ref : null, overRef };
}
