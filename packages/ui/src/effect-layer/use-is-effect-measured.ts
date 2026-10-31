import { use } from "react";
import { EffectLayerContext } from "./effect-layer-context.ts";

const isNeverMeasured = () => false;

/**
 * A function that tells whether a running effect layer has measured an
 * element with a box, so an effect can draw for it now. The function stays
 * the same while the layer does. Outside an `EffectLayerProvider` it always
 * gives `false`.
 *
 * @internal
 */
export function useIsEffectMeasured(): (element: Element) => boolean {
  return use(EffectLayerContext)?.isMeasured ?? isNeverMeasured;
}
