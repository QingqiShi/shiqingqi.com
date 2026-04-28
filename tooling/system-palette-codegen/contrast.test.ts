import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  FOREGROUND_DARK,
  FOREGROUND_LIGHT,
  pickForeground,
  relativeLuminance,
} from "./contrast.ts";

describe("relativeLuminance", () => {
  it("returns 0 for pure black", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("returns 1 for pure white", () => {
    expect(relativeLuminance("#FFFFFF")).toBe(1);
  });

  it("matches WCAG luminance for known sRGB primaries", () => {
    // Reference values from WCAG 2.x sRGB-to-luminance derivation.
    expect(relativeLuminance("#FF0000")).toBeCloseTo(0.2126, 4);
    expect(relativeLuminance("#00FF00")).toBeCloseTo(0.7152, 4);
    expect(relativeLuminance("#0000FF")).toBeCloseTo(0.0722, 4);
  });

  it("rejects malformed hex strings", () => {
    expect(() => relativeLuminance("#FFF")).toThrow();
    expect(() => relativeLuminance("not-a-hex")).toThrow();
  });
});

describe("contrastRatio", () => {
  it("is 21 between black and white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("is symmetric", () => {
    const a = contrastRatio("#3F8EFF", "#101010");
    const b = contrastRatio("#101010", "#3F8EFF");
    expect(a).toBeCloseTo(b, 6);
  });

  it("matches a known mid-tone case (Yellow 50 on white ~2.69)", () => {
    expect(contrastRatio("#C09900", "#FFFFFF")).toBeCloseTo(2.69, 1);
  });
});

describe("pickForeground", () => {
  it("returns white on dark backgrounds", () => {
    expect(pickForeground("#000000")).toBe(FOREGROUND_LIGHT);
    expect(pickForeground("#400001")).toBe(FOREGROUND_LIGHT);
  });

  it("returns black on light/mid backgrounds where black has higher contrast", () => {
    // Yellow 50 — the case from the review finding. White is 2.69:1, black is far higher.
    expect(pickForeground("#C09900")).toBe(FOREGROUND_DARK);
    expect(pickForeground("#FFFFFF")).toBe(FOREGROUND_DARK);
  });
});
