import type { Ref } from "react";

/**
 * Merge several refs into one callback ref. Object refs get their `current`
 * assigned; function refs are invoked. `null`/`undefined` refs are ignored so
 * callers can pass an optional forwarded ref straight through. When the merged
 * ref detaches, each function ref's own cleanup runs, or it is invoked with
 * `null` when it returned none — so a ref from an effect hook, such as
 * `useRipple`, merges with another ref on the same element.
 *
 * The merged ref detaches on whichever comes first: the cleanup it returned, a
 * call with `null`, or a call with a new element. Each attach detaches once.
 *
 * Returns `undefined` when no non-null refs are supplied, so a presentational
 * component can assign the result directly (`ref={mergeRefs(ref)}`) without
 * attaching a no-op callback — attaching any ref is illegal when the component
 * renders in a Server Component, and `ref={undefined}` is inert there.
 */
export function mergeRefs<T>(
  ...refs: ReadonlyArray<Ref<T> | undefined>
): ((node: T | null) => (() => void) | undefined) | undefined {
  const active = refs.filter((ref) => ref != null);
  if (active.length === 0) {
    return undefined;
  }
  let detachAttached: (() => void) | undefined;
  return (node) => {
    detachAttached?.();
    if (node === null) {
      return undefined;
    }
    const cleanups = active.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(node);
        return typeof cleanup === "function"
          ? cleanup
          : () => {
              ref(null);
            };
      }
      ref.current = node;
      return () => {
        ref.current = null;
      };
    });
    const detach = () => {
      if (detachAttached !== detach) {
        return;
      }
      detachAttached = undefined;
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
    detachAttached = detach;
    return detach;
  };
}
