import { describe, expect, it } from "vitest";
import {
  PALETTE_DRIFT_THRESHOLD,
  paletteRefFor,
  planColorEdit,
  planScalarEdit,
} from "./apply-plan.ts";
import type { ColorEdit, ScalarEdit } from "./changeset-schema.ts";

describe("paletteRefFor", () => {
  it("formats a hue + tone as a source reference", () => {
    expect(paletteRefFor("gray", 20)).toBe("gray._20");
    expect(paletteRefFor("purple", 30)).toBe("purple._30");
  });
});

describe("planColorEdit", () => {
  it("snaps an on-palette color to its tone with no drift", () => {
    const edit: ColorEdit = {
      kind: "color",
      path: "color.textMain",
      theme: "light",
      oldValue: "rgb(48, 49, 46)",
      newValue: "#30312E", // gray._20 exactly
    };
    const plan = planColorEdit(edit);
    expect(plan.targetObject).toBe("light");
    expect(plan.expression).toBe("gray._20");
    expect(plan.drift).toBeNull();
  });

  it("targets the dark object when the edit is for dark", () => {
    const edit: ColorEdit = {
      kind: "color",
      path: "color.bgSurface",
      theme: "dark",
      oldValue: "rgb(0, 0, 0)",
      newValue: "#151614", // gray._7
    };
    expect(planColorEdit(edit).targetObject).toBe("dark");
  });

  it("flags an off-palette pick using the precomputed suggestion", () => {
    const edit: ColorEdit = {
      kind: "color",
      path: "color.accent",
      theme: "light",
      oldValue: "rgb(0, 0, 0)",
      newValue: "#123456",
      paletteSuggestion: {
        hue: "blue",
        tone: 30,
        hex: "#1A3A5A",
        distance: PALETTE_DRIFT_THRESHOLD + 40,
      },
    };
    const plan = planColorEdit(edit);
    expect(plan.expression).toBe("blue._30");
    expect(plan.drift).toContain("Off-palette");
  });

  it("writes a raw value when the color can't be parsed", () => {
    const edit: ColorEdit = {
      kind: "color",
      path: "color.accent",
      theme: "light",
      oldValue: "rgb(0, 0, 0)",
      newValue: "definitely-not-a-color",
    };
    const plan = planColorEdit(edit);
    expect(plan.expression).toBe('"definitely-not-a-color"');
    expect(plan.drift).toContain("Could not parse");
  });

  it("keeps the rgba recipe shape and alpha for translucent tokens", () => {
    const edit: ColorEdit = {
      kind: "color",
      path: "color.accentBorder",
      theme: "dark",
      // The resolved source was an `rgba(${purple_rgb._30}, 0.4)` recipe.
      oldValue: "rgba(91, 33, 182, 0.4)",
      newValue: "#5b21b6",
      paletteSuggestion: {
        hue: "purple",
        tone: 30,
        hex: "#5B21B6",
        distance: 2,
      },
    };
    const plan = planColorEdit(edit);
    expect(plan.targetObject).toBe("dark");
    expect(plan.expression).toBe("`rgba(${purple_rgb._30}, 0.4)`");
    expect(plan.drift).toBeNull();
  });
});

describe("planScalarEdit", () => {
  it("splits the path into group and member", () => {
    const edit: ScalarEdit = {
      kind: "length",
      path: "space._3",
      oldValue: "1rem",
      newValue: "1.25rem",
    };
    expect(planScalarEdit(edit)).toEqual({
      group: "space",
      member: "_3",
      value: "1.25rem",
    });
  });
});
