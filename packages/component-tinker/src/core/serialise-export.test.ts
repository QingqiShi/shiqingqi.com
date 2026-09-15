import { describe, expect, it } from "vitest";
import { BASE } from "./condition-key.ts";
import { configHash, createChangeStore } from "./create-change-store.ts";
import { serialiseExport } from "./serialise-export.ts";
import type { TinkerConfig } from "./types.ts";

function makeConfig(): TinkerConfig {
  return {
    component: "SegmentedControl",
    source: "packages/ui/src/components/forms/segmented-control.tsx",
    layers: {
      track: {
        base: { borderColor: "color.border" },
      },
      option: {
        base: {},
        variants: { sm: { paddingInline: "controlSize._2" } },
        states: {
          hover: {},
          selected: {
            backgroundColor: "color.bgSurface",
            boxShadow: "shadow._1",
          },
        },
      },
      before: {
        base: {},
        variants: { sm: {} },
        states: {
          "checked sm": { transform: "translateX({controlSize._8})" },
        },
      },
    },
    cells: [],
  };
}

describe("serialiseExport", () => {
  it("prints the header, then one line per change, in the design.md format", () => {
    const config = makeConfig();
    const store = createChangeStore(config);

    store.set(
      "option",
      { kind: "state", name: "selected" },
      "backgroundColor",
      "color.bgSurfaceRaised",
    );
    store.set("track", BASE, "borderColor", "color.bgNeutral");
    store.set(
      "option",
      { kind: "variant", name: "sm" },
      "paddingInline",
      "controlSize._3",
    );
    store.set(
      "option",
      { kind: "state", name: "hover" },
      "backgroundColor",
      "color.bgControlHover",
    );
    store.remove("option", { kind: "state", name: "selected" }, "boxShadow");
    store.set(
      "before",
      { kind: "compound", name: "checked sm" },
      "transform",
      "translateX({controlSize._9})",
    );
    store.setToggle("option", "texture", "dot space._1 color.border");
    store.setToggle(
      "track",
      "glass",
      "color.bgMaterialGlass 100% color.borderMaterialGlass 100% color.borderMaterialGlassHighlight 100% radius 8px",
    );

    expect(serialiseExport(config, store)).toBe(
      [
        "component-tinker v1",
        "component: SegmentedControl",
        "source: packages/ui/src/components/forms/segmented-control.tsx",
        "track.borderColor: color.border -> color.bgNeutral",
        "option[sm].paddingInline: controlSize._2 -> controlSize._3",
        "option[hover].backgroundColor: (unset) -> color.bgControlHover",
        "option[selected].backgroundColor: color.bgSurface -> color.bgSurfaceRaised",
        "option[selected].boxShadow: shadow._1 -> (unset)",
        "before[checked sm].transform: translateX({controlSize._8}) -> translateX({controlSize._9})",
        "track.glass: none -> color.bgMaterialGlass 100% color.borderMaterialGlass 100% color.borderMaterialGlassHighlight 100% radius 8px",
        "option.texture: none -> dot space._1 color.border",
        "",
      ].join("\n"),
    );
  });

  it("prints a glass toggle's blur-off radius as written", () => {
    const config = makeConfig();
    const store = createChangeStore(config);

    store.setToggle(
      "track",
      "glass",
      "color.bgMaterialGlass 100% color.borderMaterialGlass 100% color.borderMaterialGlassHighlight 100% radius off",
    );

    expect(serialiseExport(config, store)).toBe(
      [
        "component-tinker v1",
        "component: SegmentedControl",
        "source: packages/ui/src/components/forms/segmented-control.tsx",
        "track.glass: none -> color.bgMaterialGlass 100% color.borderMaterialGlass 100% color.borderMaterialGlassHighlight 100% radius off",
        "",
      ].join("\n"),
    );
  });

  it("prints only the header when there is no change to report", () => {
    const config = makeConfig();
    const store = createChangeStore(config);

    expect(serialiseExport(config, store)).toBe(
      [
        "component-tinker v1",
        "component: SegmentedControl",
        "source: packages/ui/src/components/forms/segmented-control.tsx",
        "",
      ].join("\n"),
    );
  });

  it("omits an edit that sets a property back to the config's own value", () => {
    const config = makeConfig();
    const store = createChangeStore(config);

    store.set("track", BASE, "borderColor", "color.border");

    expect(store.changes()).toEqual([]);
    expect(serialiseExport(config, store)).toBe(
      [
        "component-tinker v1",
        "component: SegmentedControl",
        "source: packages/ui/src/components/forms/segmented-control.tsx",
        "",
      ].join("\n"),
    );
  });
});

describe("configHash", () => {
  it("is stable for the same config", () => {
    expect(configHash(makeConfig())).toBe(configHash(makeConfig()));
  });

  it("differs when a layer's style changes", () => {
    const changed = makeConfig();
    changed.layers.track.base = { borderColor: "color.bgNeutral" };
    expect(configHash(changed)).not.toBe(configHash(makeConfig()));
  });

  it("differs when the component name changes", () => {
    const changed = { ...makeConfig(), component: "Switch" };
    expect(configHash(changed)).not.toBe(configHash(makeConfig()));
  });
});
