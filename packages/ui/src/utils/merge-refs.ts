import type { Ref } from "react";

/**
 * Merge several refs into one callback ref. Object refs get their `current`
 * assigned; function refs are invoked. `null`/`undefined` refs are ignored so
 * callers can pass an optional forwarded ref straight through.
 *
 * Returns `undefined` when no non-null refs are supplied, so a presentational
 * component can assign the result directly (`ref={mergeRefs(ref)}`) without
 * attaching a no-op callback — attaching any ref is illegal when the component
 * renders in a Server Component, and `ref={undefined}` is inert there.
 *
 * Internal helper — not part of the package's public API.
 */
export function mergeRefs<T>(
  ...refs: ReadonlyArray<Ref<T> | undefined>
): ((node: T | null) => void) | undefined {
  const active = refs.filter((ref) => ref != null);
  if (active.length === 0) {
    return undefined;
  }
  return (node) => {
    for (const ref of active) {
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}
