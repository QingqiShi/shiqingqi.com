import { describe, expect, it } from "vitest";
import { parseCssColor } from "./parse-css-color.ts";

describe("parseCssColor", () => {
  it("reads the legacy and the modern rgb() syntax", () => {
    const opaque = { r: 1, g: 0, b: 51 / 255, a: 1 };
    expect(parseCssColor("rgb(255, 0, 51)")).toEqual(opaque);
    expect(parseCssColor("rgb(255 0 51)")).toEqual(opaque);
    expect(parseCssColor(" RGB(255,0,51) ")).toEqual(opaque);
  });

  it("reads the alpha as a number or a percentage", () => {
    expect(parseCssColor("rgba(0, 0, 0, 0.5)")?.a).toBe(0.5);
    expect(parseCssColor("rgb(0 0 0 / 25%)")?.a).toBe(0.25);
  });

  it("reads color(srgb …) and clamps channels outside the gamut", () => {
    expect(parseCssColor("color(srgb 0.5 1.2 -0.1 / 1)")).toEqual({
      r: 0.5,
      g: 1,
      b: 0,
      a: 1,
    });
  });

  it("does not guess at other colour spaces", () => {
    expect(parseCssColor("oklch(0.97 0 0)")).toBeNull();
    expect(parseCssColor("color(display-p3 1 0 0)")).toBeNull();
    expect(parseCssColor("var(--bg)")).toBeNull();
  });
});
