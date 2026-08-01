import { describe, expect, it } from "vitest";
import {
  DESIGN_SYSTEM_CATEGORY_ORDER,
  DESIGN_SYSTEM_PATHS,
  DESIGN_SYSTEM_ROUTES,
  DESIGN_SYSTEM_SECTION_ORDER,
  getDesignSystemRouteSections,
  matchesDesignSystemQuery,
} from "./routes.ts";

// The shape of the route map, not its contents: these are the invariants the
// nav rail and the overview browser both lean on, and neither can assert them
// (both resolve localized copy, so neither is importable from a plain test).
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

describe("matchesDesignSystemQuery", () => {
  it("matches everything on an empty query", () => {
    const unmatched = DESIGN_SYSTEM_PATHS.filter(
      (path) => !matchesDesignSystemQuery(path, "", ""),
    );
    expect(unmatched).toEqual([]);
  });

  it("ignores case and the separators between words", () => {
    for (const query of ["Text field", "text-field", "TEXTFIELD"]) {
      expect(
        matchesDesignSystemQuery(
          "/design-system/components/text-field",
          "Text field",
          query,
        ),
      ).toBe(true);
    }
  });

  // The point of `keywords`: a visitor searches with the word they arrived
  // with, including the ones the glossary rules out.
  it("finds a route by the word a visitor arrives with", () => {
    expect(
      matchesDesignSystemQuery(
        "/design-system/components/overlay",
        "Overlay",
        "modal",
      ),
    ).toBe(true);
    expect(
      matchesDesignSystemQuery("/design-system/components/chip", "Chip", "tag"),
    ).toBe(true);
  });

  // Chinese labels carry no English, so the slug is what keeps a component
  // findable by its English name in the zh locale.
  it("matches the English slug under a localized label", () => {
    expect(
      matchesDesignSystemQuery(
        "/design-system/components/switch",
        "开关",
        "switch",
      ),
    ).toBe(true);
  });

  it("does not match an unrelated query", () => {
    expect(
      matchesDesignSystemQuery(
        "/design-system/components/button",
        "Button",
        "carousel",
      ),
    ).toBe(false);
  });
});
