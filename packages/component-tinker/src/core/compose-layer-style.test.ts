import { describe, expect, it } from "vitest";
import { composeLayerStyle } from "./compose-layer-style.ts";
import { createChangeStore } from "./create-change-store.ts";
import { createTokenIndex } from "./create-token-index.ts";
import { styleReader } from "./render-cell.ts";
import type { Catalogue, LayerConfig, TinkerConfig } from "./types.ts";

/**
 * A small catalogue with just enough tokens and one preset to exercise
 * composition order, so a test failure points at the ordering logic rather
 * than at the real design system.
 */
function makeCatalogue(): Catalogue {
  const tokens = (group: string, members: string[]) => ({
    kind: "var" as const,
    tokens: members.map((member) => ({
      name: `${group}.${member}`,
      member,
      ref: `var(--${group}-${member})`,
      hint: member,
    })),
  });

  return {
    version: 1,
    groups: {
      color: tokens("color", ["base", "hover", "focusState", "presetFocus"]),
      space: tokens("space", ["sm", "full"]),
      border: tokens("border", ["thin", "thick"]),
    },
    presets: {
      "a11y.focusRing": {
        name: "a11y.focusRing",
        group: "a11y",
        member: "focusRing",
        className: "focus-ring-class",
        source: "primitives/a11y.stylex.ts",
        properties: {},
        states: {
          focus: { outlineColor: "color.presetFocus", outlineStyle: "solid" },
        },
        hint: "outlineColor, outlineStyle",
      },
    },
    unlisted: {},
  };
}

/**
 * `compoundOrder` controls only the declaration order of the two compound
 * keys, so a test can show that order — not the variants passed in — decides
 * which compound key wins.
 */
function makeLayerConfig(
  compoundOrder:
    | readonly ["focus sm", "focus fullWidth"]
    | readonly ["focus fullWidth", "focus sm"] = [
    "focus sm",
    "focus fullWidth",
  ],
): LayerConfig {
  const compoundStyles = {
    "focus sm": { outlineWidth: "border.thin" },
    "focus fullWidth": { outlineWidth: "border.thick" },
  };
  return {
    presets: ["a11y.focusRing"],
    base: { color: "color.base", display: "flex" },
    variants: {
      sm: { padding: "space.sm" },
      fullWidth: { padding: "space.full", display: "block" },
    },
    states: {
      hover: { color: "color.hover" },
      focus: { color: "color.focusState", outlineColor: "color.focusState" },
      [compoundOrder[0]]: compoundStyles[compoundOrder[0]],
      [compoundOrder[1]]: compoundStyles[compoundOrder[1]],
    },
  };
}

/** A reader over a config with no edits applied, for order-only assertions. */
function baselineReader(layerConfig: LayerConfig) {
  const config: TinkerConfig = {
    component: "Test",
    source: "test.tsx",
    layers: { layer: layerConfig },
    cells: [],
  };
  return styleReader(createChangeStore(config), "layer");
}

describe("composeLayerStyle", () => {
  const index = createTokenIndex(makeCatalogue());

  it("applies a preset's class before base and every condition's classes", () => {
    const layerConfig = makeLayerConfig();
    const composed = composeLayerStyle({
      layerConfig,
      variants: [],
      states: [],
      index,
      read: baselineReader(layerConfig),
    });
    expect(composed.classNames).toEqual(["focus-ring-class"]);
  });

  it("lets a variant override base, and the last active variant win a shared property", () => {
    const layerConfig = makeLayerConfig();
    const composed = composeLayerStyle({
      layerConfig,
      variants: ["fullWidth", "sm"],
      states: [],
      index,
      read: baselineReader(layerConfig),
    });
    // `fullWidth` sets padding first, `sm` is active after it, so `sm` wins.
    expect(composed.style.padding).toBe("var(--space-sm)");
    expect(composed.sources.padding).toEqual({ kind: "variant", name: "sm" });
    // Only `fullWidth` sets display, and it overrides base's "flex".
    expect(composed.style.display).toBe("block");
  });

  it("composes active variants in the order given, not the order declared", () => {
    const layerConfig = makeLayerConfig();
    const declaredOrder = composeLayerStyle({
      layerConfig,
      variants: ["sm", "fullWidth"],
      states: [],
      index,
      read: baselineReader(layerConfig),
    });
    expect(declaredOrder.style.padding).toBe("var(--space-full)");
  });

  it("composes active states in the order given, after variants", () => {
    const layerConfig = makeLayerConfig();
    const hoverLast = composeLayerStyle({
      layerConfig,
      variants: [],
      states: ["focus", "hover"],
      index,
      read: baselineReader(layerConfig),
    });
    expect(hoverLast.style.color).toBe("var(--color-hover)");

    const focusLast = composeLayerStyle({
      layerConfig,
      variants: [],
      states: ["hover", "focus"],
      index,
      read: baselineReader(layerConfig),
    });
    expect(focusLast.style.color).toBe("var(--color-focusState)");
  });

  it("paints a preset's pseudo-class branch before the state it precedes", () => {
    const layerConfig = makeLayerConfig();
    const composed = composeLayerStyle({
      layerConfig,
      variants: [],
      states: ["focus"],
      index,
      read: baselineReader(layerConfig),
    });
    // The state's own declaration overrides the preset's for outlineColor...
    expect(composed.style.outlineColor).toBe("var(--color-focusState)");
    expect(composed.sources.outlineColor).toEqual({
      kind: "state",
      name: "focus",
    });
    // ...but outlineStyle is the preset's alone, since no state sets it.
    expect(composed.style.outlineStyle).toBe("solid");
    expect(composed.sources.outlineStyle).toEqual({
      kind: "preset",
      name: "a11y.focusRing",
    });
  });

  it("composes active compound keys last, in the order written in states", () => {
    const layerConfig = makeLayerConfig();
    const composed = composeLayerStyle({
      layerConfig,
      variants: ["sm", "fullWidth"],
      states: ["focus"],
      index,
      read: baselineReader(layerConfig),
    });
    // Both "focus sm" and "focus fullWidth" are active; "focus fullWidth" is
    // written after "focus sm" in `states`, so it wins.
    expect(composed.style.outlineWidth).toBe("var(--border-thick)");
    expect(composed.sources.outlineWidth).toEqual({
      kind: "compound",
      name: "focus fullWidth",
    });
  });

  it("orders compound keys by their position in states, not in variants", () => {
    const reordered = makeLayerConfig(["focus fullWidth", "focus sm"]);
    const composed = composeLayerStyle({
      layerConfig: reordered,
      variants: ["sm", "fullWidth"],
      states: ["focus"],
      index,
      read: baselineReader(reordered),
    });
    // Now "focus sm" is written last, so it wins instead.
    expect(composed.style.outlineWidth).toBe("var(--border-thin)");
  });
});
