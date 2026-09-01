import { describe, expect, it } from "vitest";
import { relativeLuminance } from "./relative-luminance.ts";

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
