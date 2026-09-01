import { DESIGN_SYSTEM_CATEGORY_ORDER } from "./design-system-category-order.ts";
import { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";
import { DESIGN_SYSTEM_SECTION_ORDER } from "./design-system-section-order.ts";
import type { DesignSystemRouteSection } from "./types.ts";

/**
 * The routes bucketed two levels deep and ordered for rendering: one entry per
 * section that has routes, each holding either a single uncategorized group or
 * one group per category that has routes. Pure (no i18n) so the client nav and
 * the server overview iterate identical structure and differ only in how they
 * resolve labels.
 */
export function getDesignSystemRouteSections(): DesignSystemRouteSection[] {
  return DESIGN_SYSTEM_SECTION_ORDER.map((section) => {
    const routes = DESIGN_SYSTEM_ROUTES.filter(
      (route) => route.section === section,
    );
    const uncategorized = routes
      .filter((route) => route.category === undefined)
      .map((route) => route.path);
    const categorized = DESIGN_SYSTEM_CATEGORY_ORDER.map((category) => ({
      category,
      paths: routes
        .filter((route) => route.category === category)
        .map((route) => route.path),
    })).filter((group) => group.paths.length > 0);

    return {
      section,
      groups: [
        ...(uncategorized.length > 0 ? [{ paths: uncategorized }] : []),
        ...categorized,
      ],
    };
  }).filter((entry) => entry.groups.length > 0);
}
