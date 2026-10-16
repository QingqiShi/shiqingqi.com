import { use } from "react";
import { EffectLayerContext } from "./effect-layer-context.ts";
import { roleBits } from "./effect-roles.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { readEffectLayerMode } from "./read-effect-layer-mode.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const DROPS = roleBits(["sheetDrops"]);

/**
 * Registers a Sheet's card for the liquid drops, while `enabled`. Returns
 * the ref for the card, the ref for a hidden element that keeps the layer
 * ready, and a check of whether the effect layer can draw
 * the drops now: inside an `EffectLayerProvider`, with WebGPU, with effects
 * on and without forced colours. The Sheet's controller checks reduced
 * motion itself.
 *
 * @internal
 */
export function useSheetDrops(enabled: boolean) {
  const register = use(EffectLayerContext);
  const ref = useEffectRegistration(enabled ? DROPS : 0, NO_SETTINGS);
  // A second registration on a hidden element keeps the effect layer and
  // the drops ready while the Sheet is closed, so the first open does not
  // wait for a device.
  const warmRef = useEffectRegistration(enabled ? DROPS : 0, NO_SETTINGS);
  const canDraw = () =>
    register !== null &&
    "gpu" in navigator &&
    readEffectLayerMode() !== "off" &&
    !window.matchMedia("(forced-colors: active)").matches;
  return {
    ref: enabled ? ref : null,
    warmRef: enabled ? warmRef : null,
    canDraw,
  };
}
