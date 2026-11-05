import { createContext, use } from "react";
import type { SplitViewColumnState } from "./types.ts";

/** @internal */
export const SplitViewColumnContext =
  createContext<SplitViewColumnState | null>(null);

/**
 * Which column is around the caller, and the box that scrolls it. `null`
 * outside a `NavigationSplitView`.
 *
 * @internal
 */
export function useSplitViewColumn() {
  return use(SplitViewColumnContext);
}
