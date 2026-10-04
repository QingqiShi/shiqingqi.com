import { useMemo, useState, type RefCallback } from "react";
import { allocateScope } from "./effect-scope-context.ts";
import { NO_SETTINGS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

/**
 * An Effect container as `useEffectContainer` returns it: the ref for the
 * container element, which also carries the scope it holds, for
 * `EffectContainer`.
 */
export type EffectContainerRef = RefCallback<Element> & {
  /** @internal */
  readonly scope: number;
};

/**
 * Makes an element an Effect container, which keeps the effects inside it
 * apart from the rest of the page: attach the returned ref to the element,
 * and wrap its content in `<EffectContainer value={ref}>` with the same ref.
 * The effect hooks under that `EffectContainer` in the React tree, also
 * when their element is portalled out, are in the container's scope. Effects
 * act only between elements of one scope, and nothing crosses the
 * container's edge. They draw on the effect layer, clipped to the
 * container's border box and to each Effect container around it, and only
 * once the container is measured. When the container's `background-color`
 * is less than half opaque, colours read the next container out, or the
 * page. From outside, the container is an Effect boundary; effect hooks of
 * its own, merged with `mergeRefs`, act in the scope around it.
 *
 * The container needs a box of its own, so not `display: contents`. It must
 * not scroll its own content: with `overflow: auto` or `scroll` the clip
 * stays on the container's box, but the effects stay where the content
 * was. Under a CSS transform or scale the clip and the effects draw at the
 * unscaled size. Outside an `EffectLayerProvider` the ref does nothing.
 */
export function useEffectContainer(): EffectContainerRef {
  const [scope] = useState(allocateScope);
  const register = useEffectRegistration(0, NO_SETTINGS, scope);
  return useMemo(
    () =>
      Object.assign((element: Element | null) => register(element), {
        scope,
      }),
    [register, scope],
  );
}
