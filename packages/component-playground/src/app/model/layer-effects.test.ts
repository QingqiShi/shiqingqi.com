import type { TokenIndex } from "@tuja/component-playground";
import { describe, expect, it } from "vitest";
import {
  GLASS_DEFAULT,
  effectsStylesheet,
  formatGlass,
  parseGlass,
  type LayerEffects,
} from "./layer-effects.ts";

/** A token index that resolves only the names it is given. */
function fakeIndex(refs: Record<string, string>): TokenIndex {
  return {
    catalogue: { version: 1, groups: {}, presets: {}, unlisted: {} },
    names: Object.keys(refs),
    presetNames: [],
    token: () => undefined,
    ref: (name) => refs[name],
    isPresetToken: () => false,
  };
}

const GLASS_REFS = {
  "color.glassFill": "var(--glass-fill)",
  "color.glassBorder": "var(--glass-border)",
  "color.glassHighlight": "var(--glass-highlight)",
  "shadow._2": "var(--shadow-2)",
};

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

// Both cases keep the border and the highlight at 100%, so the rim rule is
// the same in each.
const GLASS_RIM_RULE =
  '.pg-cell-body [data-layer="track"]::before { content: ""; position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; padding: 0.5px; pointer-events: none; background-image: linear-gradient(180deg, var(--glass-highlight) 0%, transparent 35%, transparent 65%, color-mix(in srgb, var(--glass-highlight) 60%, transparent) 100%), linear-gradient(var(--glass-border), var(--glass-border)); -webkit-mask-image: linear-gradient(#000 0 0), linear-gradient(#000 0 0); -webkit-mask-clip: content-box, border-box; -webkit-mask-composite: xor; mask-image: linear-gradient(#000 0 0), linear-gradient(#000 0 0); mask-clip: content-box, border-box; mask-composite: exclude; }';

describe("effectsStylesheet for glass", () => {
  it("emits the token's own value at 100% opacity", () => {
    const effects: Record<string, LayerEffects> = {
      track: { glass: parseGlass(GLASS_DEFAULT) },
    };
    const css = effectsStylesheet(effects, fakeIndex(GLASS_REFS));
    expect(css).toBe(
      [
        '.pg-cell-body [data-layer="track"] { position: relative; background-color: var(--glass-fill); backdrop-filter: blur(8px); box-shadow: var(--shadow-2), inset 0 -1px 1px color-mix(in srgb, var(--glass-highlight) 64%, transparent); }',
        GLASS_RIM_RULE,
      ].join("\n"),
    );
  });

  it("scales a part's colour with color-mix at a reduced opacity", () => {
    const effects: Record<string, LayerEffects> = {
      track: {
        glass: parseGlass(
          "color.glassFill 80% color.glassBorder 100% color.glassHighlight 100% radius 8px",
        ),
      },
    };
    const css = effectsStylesheet(effects, fakeIndex(GLASS_REFS));
    expect(css).toBe(
      [
        '.pg-cell-body [data-layer="track"] { position: relative; background-color: color-mix(in srgb, var(--glass-fill) 80%, transparent); backdrop-filter: blur(8px); box-shadow: var(--shadow-2), inset 0 -1px 1px color-mix(in srgb, var(--glass-highlight) 64%, transparent); }',
        GLASS_RIM_RULE,
      ].join("\n"),
    );
  });

  it("emits no backdrop-filter when the blur is off", () => {
    const effects: Record<string, LayerEffects> = {
      track: {
        glass: parseGlass(
          "color.glassFill 100% color.glassBorder 100% color.glassHighlight 100% radius off",
        ),
      },
    };
    const css = effectsStylesheet(effects, fakeIndex(GLASS_REFS));
    expect(css).toBe(
      [
        '.pg-cell-body [data-layer="track"] { position: relative; background-color: var(--glass-fill); box-shadow: var(--shadow-2), inset 0 -1px 1px color-mix(in srgb, var(--glass-highlight) 64%, transparent); }',
        GLASS_RIM_RULE,
      ].join("\n"),
    );
  });
});
