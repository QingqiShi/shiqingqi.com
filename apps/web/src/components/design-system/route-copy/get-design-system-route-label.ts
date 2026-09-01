import "server-only";
import type { DesignSystemPath } from "../routes/types.ts";
import { getDesignSystemRouteLabels } from "./get-design-system-route-labels.ts";

/** One route's name — the page `h1`, its trailing crumb, and its metadata title. */
export function getDesignSystemRouteLabel(path: DesignSystemPath): string {
  return getDesignSystemRouteLabels()[path];
}
