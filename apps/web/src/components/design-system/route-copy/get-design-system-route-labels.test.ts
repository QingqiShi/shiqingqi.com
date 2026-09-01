import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import { DESIGN_SYSTEM_PATHS } from "../routes/design-system-paths.ts";
import { getDesignSystemRouteLabels } from "./get-design-system-route-labels.ts";

describe("getDesignSystemRouteLabels", () => {
  beforeEach(() => {
    setLocale("en");
  });

  // The `Record` type already forces this at compile time; the runtime check is
  // what catches a name that resolved to nothing — an unregistered `t()` key
  // renders as an empty crumb, an empty `h1` and an empty rail link.
  it("names every registered route, and nothing else", () => {
    const labels = getDesignSystemRouteLabels();

    expect(Object.keys(labels).toSorted()).toEqual(
      [...DESIGN_SYSTEM_PATHS].toSorted(),
    );
    expect(Object.values(labels).filter((label) => label === "")).toEqual([]);
  });

  it("localises every name", () => {
    setLocale("zh");
    const labels = getDesignSystemRouteLabels();

    expect(labels["/design-system/foundations/borders"]).toBe("描边");
    expect(labels["/design-system/components/chip"]).toBe("标签按钮");
  });
});
