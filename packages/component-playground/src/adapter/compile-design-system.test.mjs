import { beforeAll, describe, expect, it } from "vitest";
import { buildAdapter } from "./index.mjs";

describe("buildAdapter", () => {
  // Compiling the whole design system is the expensive part, so it happens
  // once and every test below reads the same result.
  let adapter;

  beforeAll(() => {
    adapter = buildAdapter();
  });

  it("compiles CSS carrying a resolved token var and the Inter @font-face", () => {
    expect(adapter.css).toContain("var(--");
    expect(adapter.css).toMatch(/@font-face/);
    expect(adapter.css).toMatch(/Inter/);
  });

  // The effect toggles apply these members and turn these dials, so a rename
  // in `@tuja/ui` has to fail here rather than draw nothing on the canvas.
  it("reads the members and dials the effect toggles switch on", () => {
    const { presets, unlisted } = adapter.catalogue;
    for (const name of [
      "texture.dot",
      "texture.line",
      "wash.toBottom",
      "wash.toTop",
      "wash.toRight",
      "wash.toLeft",
      "glassSurface.base",
    ]) {
      expect(presets[name].className).toMatch(/\S/);
    }
    for (const dial of [
      "textureTokens.pitch",
      "textureTokens.ink",
      "washTokens.tone",
      "glassTokens.fill",
      "glassTokens.border",
      "glassTokens.highlight",
      "glassTokens.blur",
    ]) {
      expect(unlisted[dial]).toMatch(/^var\(--/);
    }
  });

  // The Glass rim is a `::before` on one of the member's own classes, so
  // applying the class is all the playground has to do to draw it.
  it("ships the Glass rim with the member's classes", () => {
    const classes = adapter.catalogue.presets["glassSurface.base"].className;
    const rim = classes
      .split(" ")
      .filter((name) => adapter.css.includes(`.${name}::before`));
    expect(rim.length).toBeGreaterThan(0);
  });

  // A dial no toggle turns still has to resolve, or a preset a layer applies
  // silently falls back to the design system's default.
  it("resolves every dial, not only the ones the toggles turn", () => {
    expect(adapter.catalogue.unlisted["cornerTokens.height"]).toMatch(
      /^var\(--/,
    );
    expect(adapter.catalogue.unlisted["shadow._2"]).toMatch(/^var\(--/);
  });

  it("builds a catalogue with the groups the pickers need", () => {
    for (const group of [
      "color",
      "space",
      "controlSize",
      "font",
      "border",
      "layer",
      "opacity",
      "ratio",
    ]) {
      expect(adapter.catalogue.groups[group]).toBeDefined();
      expect(adapter.catalogue.groups[group].tokens.length).toBeGreaterThan(0);
    }
  });
});
