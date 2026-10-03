import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

/**
 * Registers an element on the effect layer with no effect of its own, so
 * that effects can see it and draw around it: attach the returned ref to the
 * element. While it stays attached, the layer measures the element's border
 * box, its corner radii and its `background-color`, and measures again after
 * each signal that they can have changed, so they follow scrolling, layout
 * shifts, resizes, theme changes, hover, focus and CSS transitions.
 * `?effects=debug` draws what it measured. The element needs a box of its
 * own, so not `display: contents`. Outside an `EffectLayerProvider` the ref
 * does nothing.
 *
 * The effect hooks — `useRipple`, `useDust`, `useExtractorFan`,
 * `useBlackHole` and `useLightBeam` — register their element the same way, so
 * an element with an effect needs no `useEffectBoundary` as well.
 */
export function useEffectBoundary() {
  return useEffectRegistration(0, NO_SETTINGS);
}
