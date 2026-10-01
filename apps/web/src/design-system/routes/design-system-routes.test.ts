import { describe, expect, it } from "vitest";
import { DESIGN_SYSTEM_CATEGORY_ORDER } from "./design-system-category-order.ts";
import { DESIGN_SYSTEM_PATHS } from "./design-system-paths.ts";
import { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";
import { DESIGN_SYSTEM_SECTION_ORDER } from "./design-system-section-order.ts";
import { getDesignSystemRouteSections } from "./get-design-system-route-sections.ts";

// The shape of the route map, not its contents: these are the invariants the
// nav rail and the overview browser both lean on, and neither can assert them
// (both resolve localised copy, so neither is importable from a plain test).
describe("design-system route map", () => {
  const sections = getDesignSystemRouteSections();

  it("registers each path once", () => {
    expect(new Set(DESIGN_SYSTEM_PATHS).size).toBe(DESIGN_SYSTEM_PATHS.length);
  });

  it("orders each section and category once", () => {
    expect(new Set(DESIGN_SYSTEM_SECTION_ORDER).size).toBe(
      DESIGN_SYSTEM_SECTION_ORDER.length,
    );
    expect(new Set(DESIGN_SYSTEM_CATEGORY_ORDER).size).toBe(
      DESIGN_SYSTEM_CATEGORY_ORDER.length,
    );
  });

  // A route whose section or category is missing from the order arrays is
  // silently dropped by every consumer — a page that exists but nothing links to.
  it("renders every registered path exactly once", () => {
    const rendered = sections.flatMap((section) =>
      section.groups.flatMap((group) => group.paths),
    );
    expect(rendered.toSorted()).toEqual([...DESIGN_SYSTEM_PATHS].toSorted());
  });

  // A section either splits into categories or lists its routes directly.
  // Half-categorized, the leftovers render as an unheaded group above the
  // headed ones, which reads as a section with a nameless first category.
  it("categorizes all of a section's routes or none of them", () => {
    const split = [...new Set(DESIGN_SYSTEM_ROUTES.map((r) => r.section))]
      .map((section) => {
        const routes = DESIGN_SYSTEM_ROUTES.filter(
          (route) => route.section === section,
        );
        return {
          section,
          categorized: routes.filter((route) => "category" in route).length,
          total: routes.length,
        };
      })
      .filter(
        (entry) => entry.categorized > 0 && entry.categorized < entry.total,
      );
    expect(split).toEqual([]);
  });

  // Every section but `overview` renders under a heading, and so does every
  // category. A heading over one card is noise: it repeats the card and implies
  // siblings that aren't there. `overview` is the exception because it is the
  // unheaded link at the top of the rail.
  it("gives every headed group at least two routes", () => {
    const lonely = sections.flatMap((section) => {
      const total = section.groups.flatMap((group) => group.paths).length;
      const thinCategories = section.groups
        .filter(
          (group) => group.category !== undefined && group.paths.length < 2,
        )
        .map((group) => group.category);
      return [
        ...(section.section !== "overview" && total < 2
          ? [section.section]
          : []),
        ...thinCategories,
      ];
    });
    expect(lonely).toEqual([]);
  });

  // The ceiling the split was for. Nine is the top of the 7±2 a visitor can hold
  // at a glance; the flat "components" group this replaced held twenty-four.
  it("keeps every group scannable", () => {
    const oversized = sections
      .flatMap((section) => section.groups)
      .filter((group) => group.paths.length > 9)
      .map((group) => ({ group: group.category, size: group.paths.length }));
    expect(oversized).toEqual([]);
  });
});
