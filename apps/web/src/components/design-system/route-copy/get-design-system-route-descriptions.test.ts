import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import { DESIGN_SYSTEM_PATHS } from "../routes/design-system-paths.ts";
import { getDesignSystemRouteDescriptions } from "./get-design-system-route-descriptions.ts";

describe("getDesignSystemRouteDescriptions", () => {
  beforeEach(() => {
    setLocale("en");
  });

  // The `Record` type already forces this at compile time; the runtime check is
  // what catches a description that resolved to nothing — an unregistered
  // `t()` key renders as an empty tile blurb.
  it("describes every registered route, and nothing else", () => {
    const descriptions = getDesignSystemRouteDescriptions();

    expect(Object.keys(descriptions).toSorted()).toEqual(
      [...DESIGN_SYSTEM_PATHS].toSorted(),
    );
    expect(
      Object.values(descriptions).filter((description) => description === ""),
    ).toEqual([]);
  });

  it("localises every description", () => {
    setLocale("zh");
    const descriptions = getDesignSystemRouteDescriptions();

    expect(descriptions["/design-system/foundations/borders"]).toBe(
      "描边宽度与圆角阶梯。",
    );
  });
});
