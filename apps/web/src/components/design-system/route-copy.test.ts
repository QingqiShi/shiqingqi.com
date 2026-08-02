import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import {
  getDesignSystemGroupLabels,
  getDesignSystemRouteLabel,
  getDesignSystemRouteLabels,
} from "./route-copy.ts";
import {
  DESIGN_SYSTEM_CATEGORY_ORDER,
  DESIGN_SYSTEM_PATHS,
  DESIGN_SYSTEM_SECTION_ORDER,
} from "./routes.ts";

describe("design-system route copy", () => {
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

  it("heads every section and category the route map orders", () => {
    const { sections, categories } = getDesignSystemGroupLabels();

    // `overview` is the unheaded link at the top of the rail, so it alone has
    // no heading to render.
    expect(sections.overview).toBeNull();
    expect(
      DESIGN_SYSTEM_SECTION_ORDER.filter(
        (section) => section !== "overview" && !sections[section],
      ),
    ).toEqual([]);
    expect(
      DESIGN_SYSTEM_CATEGORY_ORDER.filter((category) => !categories[category]),
    ).toEqual([]);
  });

  it("reads one route's name from the same map", () => {
    expect(getDesignSystemRouteLabel("/design-system/components/chip")).toBe(
      getDesignSystemRouteLabels()["/design-system/components/chip"],
    );
  });

  it("localises every name", () => {
    setLocale("zh");
    const labels = getDesignSystemRouteLabels();

    expect(labels["/design-system/foundations/borders"]).toBe("描边");
    expect(labels["/design-system/components/chip"]).toBe("标签按钮");
  });
});
