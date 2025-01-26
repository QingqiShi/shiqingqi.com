import { useId } from "react";

/**
 * Returns an ID unique to the element, and is also a valid CSS ident.
 * Can be replaced with React's `useId()` after https://github.com/facebook/react/pull/32001
 */
export function useCssId() {
  const id = useId();
  return id.replace(/^:/, "\u00AB").replace(/:$/, "\u00BB");
}
