import { describe, expect, it } from "vitest";
import {
  DESIGN_SYSTEM_GROUP_ORDER,
  DESIGN_SYSTEM_PATHS,
  getDesignSystemRouteGroups,
} from "./routes.ts";

// The shape of the route map, not its contents: these are the invariants the
// nav rail and the overview grid both lean on, and neither can assert them
// (both resolve localized copy, so neither is importable from a plain test).
describe("design-system route groups", () => {
  const groups = getDesignSystemRouteGroups();

  it("registers each path once", () => {
    expect(new Set(DESIGN_SYSTEM_PATHS).size).toBe(DESIGN_SYSTEM_PATHS.length);
  });

  it("orders each group once", () => {
    expect(new Set(DESIGN_SYSTEM_GROUP_ORDER).size).toBe(
      DESIGN_SYSTEM_GROUP_ORDER.length,
    );
  });

  // A route whose group is missing from `DESIGN_SYSTEM_GROUP_ORDER` is silently
  // dropped from both consumers — a page that exists but nothing links to.
  it("renders every registered path exactly once", () => {
    const rendered = groups.flatMap((group) => group.paths);
    expect(rendered.toSorted()).toEqual([...DESIGN_SYSTEM_PATHS].toSorted());
  });

  // Every group but `overview` renders under a heading, and a heading over one
  // card is noise: it repeats the card and implies siblings that aren't there.
  // `overview` is the exception because it is the unheaded link at the top.
  it("gives every headed group at least two routes", () => {
    const lonely = groups
      .filter((group) => group.group !== "overview" && group.paths.length < 2)
      .map((group) => group.group);
    expect(lonely).toEqual([]);
  });

  // The ceiling the split was for. Nine is the top of the 7±2 a visitor can hold
  // at a glance; the flat "components" group this replaced held twenty-four.
  it("keeps every group scannable", () => {
    const oversized = groups
      .filter((group) => group.paths.length > 9)
      .map((group) => ({ group: group.group, size: group.paths.length }));
    expect(oversized).toEqual([]);
  });
});
