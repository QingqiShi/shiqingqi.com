import { createElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import segmentedControl from "../../examples/segmented-control.tinker.tsx";
import { buildAdapter } from "../adapter/index.mjs";
import type { Catalogue, TinkerConfig } from "./types.ts";
import { validateConfig } from "./validate-config.ts";

// buildAdapter() compiles the whole design system, so it is built once and
// shared across the tests that need the real catalogue.
let realCatalogue: Catalogue;

beforeAll(() => {
  realCatalogue = buildAdapter().catalogue;
});

/** A tiny catalogue, for the tests that check a failure rather than a name. */
function tinyCatalogue(): Catalogue {
  return {
    version: 1,
    groups: {
      color: {
        kind: "var",
        tokens: [
          {
            name: "color.surface",
            member: "surface",
            ref: "var(--x)",
            hint: "",
          },
        ],
      },
    },
    presets: {
      "known.preset": {
        name: "known.preset",
        group: "known",
        member: "preset",
        className: "known-preset",
        source: "primitives/known.stylex.ts",
        properties: {},
        states: {},
        hint: "",
      },
    },
    unlisted: {},
  };
}

describe("validateConfig", () => {
  it("passes for the real segmented-control example", () => {
    expect(validateConfig(segmentedControl, realCatalogue)).toEqual([]);
  });

  it("fails on an unknown token, naming the nearest valid one", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { layer: { base: { backgroundColor: "color.surfac" } } },
      cells: [],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('unknown token "color.surfac"');
    expect(problems[0]).toContain('Did you mean "color.surface"?');
  });

  it("fails on an unknown preset, naming the nearest valid one", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { layer: { presets: ["known.presett"], base: {} } },
      cells: [],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('unknown preset "known.presett"');
    expect(problems[0]).toContain('Did you mean "known.preset"?');
  });

  it("names the preset groups on offer when no name is close enough to suggest", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { layer: { presets: ["totally-unrelated-name"], base: {} } },
      cells: [],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Presets are known.");
  });

  it("fails when a cell renders an undeclared layer", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { known: { base: {} } },
      cells: [
        {
          title: "Cell",
          tree: createElement(
            "div",
            { "data-layer": "known" },
            createElement("span", { "data-layer": "missing" }),
          ),
        },
      ],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('Cell "Cell"');
    expect(problems[0]).toContain('data-layer="missing"');
    expect(problems[0]).toContain("does not declare");
  });

  it("fails when a cell sets a variant the layer does not declare", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { known: { base: {}, variants: { sm: {} } } },
      cells: [
        {
          title: "Cell",
          tree: createElement("div", {
            "data-layer": "known",
            "data-variant": "lg",
          }),
        },
      ],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('layer "known" has no variant "lg"');
  });

  it("fails when a cell sets a state the layer does not declare", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: { known: { base: {}, states: { hover: {} } } },
      cells: [
        {
          title: "Cell",
          tree: createElement("div", {
            "data-layer": "known",
            "data-state": "focus",
          }),
        },
      ],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('layer "known" has no state "focus"');
  });

  it("fails a compound key whose non-state part is not one of the layer's variants", () => {
    const config: TinkerConfig = {
      component: "Test",
      source: "test.tsx",
      layers: {
        // "checked" names the state the compound applies to, which a layer
        // may declare only here; "bogus" names neither a variant nor a state.
        layer: { base: {}, states: { "checked bogus": {} } },
      },
      cells: [],
    };
    const problems = validateConfig(config, tinyCatalogue());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(
      '"bogus" is neither a variant nor a state of the layer',
    );
  });
});
