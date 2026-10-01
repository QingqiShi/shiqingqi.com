import { describe, expect, it } from "vitest";
import { getDesignSystemRouteSection } from "./get-design-system-route-section.ts";

describe("getDesignSystemRouteSection", () => {
  // The breadcrumb reads its middle crumb from this.
  it("returns the section the route registered", () => {
    expect(getDesignSystemRouteSection("/design-system")).toBe("overview");
    expect(
      getDesignSystemRouteSection("/design-system/foundations/color"),
    ).toBe("foundations");
    expect(getDesignSystemRouteSection("/design-system/components/chip")).toBe(
      "components",
    );
    expect(getDesignSystemRouteSection("/design-system/primitives")).toBe(
      "composition",
    );
  });
});
