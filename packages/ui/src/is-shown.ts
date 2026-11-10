import type { ReactNode } from "react";

/**
 * Whether a slot's content renders anything, so a component can leave out the
 * slot's wrapper. `null`, `undefined`, booleans and `""` render nothing.
 *
 * @internal
 */
export function isShown(node: ReactNode) {
  return (
    node !== null &&
    node !== undefined &&
    typeof node !== "boolean" &&
    node !== ""
  );
}
