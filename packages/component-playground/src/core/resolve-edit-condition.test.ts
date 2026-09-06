import { describe, expect, it } from "vitest";
import { BASE } from "./condition-key.ts";
import { createChangeStore } from "./create-change-store.ts";
import { styleReader } from "./render-cell.ts";
import { resolveEditCondition } from "./resolve-edit-condition.ts";
import type { LayerConfig, PlaygroundConfig } from "./types.ts";

const layerConfig: LayerConfig = {
  base: {},
  variants: {
    sm: { paddingInline: "controlSize._2" },
    fullWidth: { paddingInline: "controlSize._3" },
  },
  states: {
    hover: { backgroundColor: "color.hover" },
    focus: { backgroundColor: "color.focus" },
    "focus sm": { backgroundColor: "color.focusSm" },
  },
};

function reader() {
  const config: PlaygroundConfig = {
    component: "Test",
    source: "test.tsx",
    layers: { layer: layerConfig },
    cells: [],
  };
  return styleReader(createChangeStore(config), "layer");
}

describe("resolveEditCondition", () => {
  it("rule 1: writes to the last active state that already defines the property", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "backgroundColor",
      variants: [],
      states: ["hover", "focus"],
      read: reader(),
    });
    expect(condition).toEqual({ kind: "state", name: "focus" });
  });

  it("rule 1: a compound key counts as a state, and outranks a plain state that also defines it", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "backgroundColor",
      variants: ["sm"],
      states: ["hover", "focus"],
      read: reader(),
    });
    // "focus sm" is active (focus + sm), defines backgroundColor, and design.md
    // orders it after the plain states, so it is the last state that defines it.
    expect(condition).toEqual({ kind: "compound", name: "focus sm" });
  });

  it("rule 2: else the last active variant that already defines the property", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "paddingInline",
      variants: ["sm", "fullWidth"],
      states: ["hover"],
      read: reader(),
    });
    expect(condition).toEqual({ kind: "variant", name: "fullWidth" });
  });

  it("rule 2: variant order is the order given, not the order declared", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "paddingInline",
      variants: ["fullWidth", "sm"],
      states: [],
      read: reader(),
    });
    expect(condition).toEqual({ kind: "variant", name: "sm" });
  });

  it("rule 3: else the last active plain state, even with an active compound key after it", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "fontWeight",
      variants: ["sm"],
      states: ["hover", "focus"],
      read: reader(),
    });
    // "focus sm" is active but sets no fontWeight, and neither does any
    // variant, so the broader, last plain state gets the new declaration.
    expect(condition).toEqual({ kind: "state", name: "focus" });
  });

  it("rule 3: a value a preset paints is defined by no condition of the layer, so it too lands on the state", () => {
    // `read` reflects only a condition's own declared style map, never a
    // preset's painted values (composeLayerStyle is what blends those in).
    // So a property a preset alone supplies — outlineColor here, stood in for
    // a real preset like a11y.focusRing's focus-state outline — is "defined
    // by no condition of the layer" exactly like any other undeclared
    // property, and rule 3 applies the same way.
    const condition = resolveEditCondition({
      layerConfig,
      property: "outlineColor",
      variants: [],
      states: ["hover", "focus"],
      read: reader(),
    });
    expect(condition).toEqual({ kind: "state", name: "focus" });
  });

  it("rule 4: else base, when no state is active", () => {
    const condition = resolveEditCondition({
      layerConfig,
      property: "fontWeight",
      variants: ["sm"],
      states: [],
      read: reader(),
    });
    expect(condition).toEqual(BASE);
  });
});
