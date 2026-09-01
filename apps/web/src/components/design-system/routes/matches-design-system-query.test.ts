import { describe, expect, it } from "vitest";
import { DESIGN_SYSTEM_PATHS } from "./design-system-paths.ts";
import { matchesDesignSystemQuery } from "./matches-design-system-query.ts";

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
  it("matches the English slug under a localised label", () => {
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
