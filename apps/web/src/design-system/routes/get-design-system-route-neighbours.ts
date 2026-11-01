import { getDesignSystemRouteSections } from "./get-design-system-route-sections.ts";
import type { DesignSystemPath } from "./types.ts";

export interface DesignSystemRouteNeighbours {
  /** Absent on the first route. */
  previous?: DesignSystemPath;
  /** Absent on the last route. */
  next?: DesignSystemPath;
}

/**
 * The routes before and after one route, in the order the nav rail lists
 * them, so reading page by page walks the rail from top to bottom. Pure (no
 * i18n), like the sections it flattens.
 */
export function getDesignSystemRouteNeighbours(
  path: DesignSystemPath,
): DesignSystemRouteNeighbours {
  const order = getDesignSystemRouteSections().flatMap(({ groups }) =>
    groups.flatMap((group) => group.paths),
  );
  const index = order.indexOf(path);
  if (index === -1) return {};
  return {
    previous: index > 0 ? order[index - 1] : undefined,
    next: order[index + 1],
  };
}
