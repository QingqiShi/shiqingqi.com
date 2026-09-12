import {
  createChangeStore,
  type Catalogue,
  type TokenIndex,
} from "@tuja/component-tinker";
import { describe, expect, it } from "vitest";
import {
  GLASS_DEFAULT,
  effectStyle,
  formatGlass,
  layerEffects,
  parseGlass,
  parseTexture,
  parseWash,
} from "./layer-effects.ts";

/** The compiled classes the adapter reads out of `@tuja/ui`. */
const PRESETS: Catalogue["presets"] = Object.fromEntries(
  [
    "texture.dot",
    "texture.line",
    "wash.toBottom",
    "wash.toTop",
    "glassSurface.base",
  ].map((name) => [
    name,
    {
      name,
      group: name.split(".")[0],
      member: name.split(".")[1],
      className: `c-${name.replace(".", "-")}`,
      source: "primitives/test.stylex.ts",
      properties: {},
      states: {},
      hint: "",
    },
  ]),
);

const REFS: Record<string, string> = {
  "color.glassFill": "var(--glass-fill)",
  "color.glassBorder": "var(--glass-border)",
  "color.glassHighlight": "var(--glass-highlight)",
  "color.neutralBorder": "var(--neutral-border)",
  "color.accentSurface": "var(--accent-surface)",
  "space._1": "var(--space-1)",
  "space._3": "var(--space-3)",
  "textureTokens.pitch": "var(--pitch)",
  "textureTokens.ink": "var(--ink)",
  "washTokens.tone": "var(--tone)",
  "glassTokens.fill": "var(--fill)",
  "glassTokens.border": "var(--border)",
  "glassTokens.highlight": "var(--highlight)",
  "glassTokens.blur": "var(--blur)",
};

/** A token index that resolves only the names it is given. */
function fakeIndex(): TokenIndex {
  return {
    catalogue: { version: 1, groups: {}, presets: PRESETS, unlisted: {} },
    names: Object.keys(REFS),
    presetNames: Object.keys(PRESETS),
    token: () => undefined,
    ref: (name) => REFS[name],
    isPresetToken: () => false,
  };
}

const index = fakeIndex();

describe("parseGlass / formatGlass", () => {
  it("is undefined for the off value", () => {
    expect(parseGlass("none")).toBeUndefined();
  });

  it("round-trips the default value", () => {
    const glass = parseGlass(GLASS_DEFAULT);
    if (glass === undefined)
      throw new Error("Expected GLASS_DEFAULT to parse.");
    expect(glass).toEqual({
      fill: "color.glassFill",
      fillOpacity: 100,
      border: "color.glassBorder",
      borderOpacity: 100,
      highlight: "color.glassHighlight",
      highlightOpacity: 100,
      radius: 8,
    });
    expect(formatGlass(glass)).toBe(GLASS_DEFAULT);
  });

  it("round-trips a value with reduced opacities and a different radius", () => {
    const value =
      "color.glassFill 80% color.glassBorder 60% color.glassHighlight 40% radius 16px";
    const glass = parseGlass(value);
    if (glass === undefined) throw new Error("Expected the value to parse.");
    expect(glass).toEqual({
      fill: "color.glassFill",
      fillOpacity: 80,
      border: "color.glassBorder",
      borderOpacity: 60,
      highlight: "color.glassHighlight",
      highlightOpacity: 40,
      radius: 16,
    });
    expect(formatGlass(glass)).toBe(value);
  });

  it("round-trips a value with the blur off", () => {
    const value =
      "color.glassFill 100% color.glassBorder 100% color.glassHighlight 100% radius off";
    const glass = parseGlass(value);
    if (glass === undefined) throw new Error("Expected the value to parse.");
    expect(glass.radius).toBe("off");
    expect(formatGlass(glass)).toBe(value);
  });
});

describe("parseWash", () => {
  it("reads a member name", () => {
    expect(parseWash("color.accentSurface toBottom")).toEqual({
      color: "color.accentSurface",
      direction: "toBottom",
    });
  });

  it("takes the spelling an older snapshot saved", () => {
    expect(parseWash("color.accentSurface to-bottom")).toEqual({
      color: "color.accentSurface",
      direction: "toBottom",
    });
  });

  it("renders a hydrated snapshot that holds the older spelling", () => {
    const store = createChangeStore({
      component: "Test",
      source: "test.tsx",
      layers: { track: { base: {} } },
      cells: [],
    });
    store.hydrate({
      toggles: { track: { wash: "color.accentSurface to-bottom" } },
    });
    const style = effectStyle(layerEffects(store, "track"), index);
    expect(style?.classNames).toEqual(["c-wash-toBottom"]);
    expect(style?.style["--tone"]).toBe("var(--accent-surface)");
  });
});

describe("effectStyle for texture and wash", () => {
  it("draws the mark on a box of its own with the picked dials", () => {
    const style = effectStyle(
      { texture: parseTexture("dot space._3 color.neutralBorder") },
      index,
    );
    expect(style?.texture).toEqual({
      className: "c-texture-dot",
      style: {
        position: "absolute",
        inset: "0",
        zIndex: "-1",
        borderRadius: "inherit",
        cornerShape: "inherit",
        pointerEvents: "none",
        "--pitch": "var(--space-3)",
        "--ink": "var(--neutral-border)",
      },
    });
    expect(style?.classNames).toEqual([]);
  });

  it("overrides the wider pitch the line mark carries", () => {
    const style = effectStyle(
      { texture: parseTexture("line space._1 color.neutralBorder") },
      index,
    );
    expect(style?.texture?.className).toBe("c-texture-line");
    expect(style?.texture?.style["--pitch"]).toBe("var(--space-1)");
  });

  it("stacks the texture over the wash: one on the layer, one on its box", () => {
    const style = effectStyle(
      {
        texture: parseTexture("dot space._1 color.neutralBorder"),
        wash: parseWash("color.accentSurface toBottom"),
      },
      index,
    );
    expect(style?.classNames).toEqual(["c-wash-toBottom"]);
    expect(style?.style).toMatchObject({
      position: "relative",
      isolation: "isolate",
      "--tone": "var(--accent-surface)",
    });
    expect(style?.texture?.className).toBe("c-texture-dot");
  });
});

describe("effectStyle for glass", () => {
  it("puts the member's class on the layer and turns every dial", () => {
    const style = effectStyle({ glass: parseGlass(GLASS_DEFAULT) }, index);
    expect(style?.classNames).toEqual(["c-glassSurface-base"]);
    expect(style?.style).toEqual({
      position: "relative",
      "--fill": "var(--glass-fill)",
      "--border": "var(--glass-border)",
      "--highlight": "var(--glass-highlight)",
      "--blur": "8px",
    });
  });

  it("scales a part's colour with color-mix at a reduced opacity", () => {
    const style = effectStyle(
      {
        glass: parseGlass(
          "color.glassFill 80% color.glassBorder 100% color.glassHighlight 100% radius 8px",
        ),
      },
      index,
    );
    expect(style?.style["--fill"]).toBe(
      "color-mix(in srgb, var(--glass-fill) 80%, transparent)",
    );
  });

  it("sets the blur to nothing when the radius is off", () => {
    const style = effectStyle(
      {
        glass: parseGlass(
          "color.glassFill 100% color.glassBorder 100% color.glassHighlight 100% radius off",
        ),
      },
      index,
    );
    expect(style?.style["--blur"]).toBe("0px");
  });

  it("takes the picked radius over the design system's own blur", () => {
    const style = effectStyle(
      {
        glass: parseGlass(
          "color.glassFill 100% color.glassBorder 100% color.glassHighlight 100% radius 24px",
        ),
      },
      index,
    );
    expect(style?.style["--blur"]).toBe("24px");
  });
});
