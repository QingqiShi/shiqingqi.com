import { beforeEach, describe, expect, it } from "vitest";
import { setLocale } from "#src/i18n/server-locale.ts";
import { DESIGN_SYSTEM_CATEGORY_ORDER } from "../routes/design-system-category-order.ts";
import { DESIGN_SYSTEM_SECTION_ORDER } from "../routes/design-system-section-order.ts";
import { getDesignSystemGroupLabels } from "./get-design-system-group-labels.ts";

describe("getDesignSystemGroupLabels", () => {
  beforeEach(() => {
    setLocale("en");
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
});
