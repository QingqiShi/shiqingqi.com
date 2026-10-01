import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import { getDesignSystemRouteLabel } from "./get-design-system-route-label.ts";
import { getDesignSystemRouteLabels } from "./get-design-system-route-labels.ts";

describe("getDesignSystemRouteLabel", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("reads one route's name from the same map", () => {
    expect(getDesignSystemRouteLabel("/design-system/components/chip")).toBe(
      getDesignSystemRouteLabels()["/design-system/components/chip"],
    );
  });
});
