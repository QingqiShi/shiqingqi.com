import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast-ratio.ts";

describe("contrastRatio", () => {
  it("is 21 between black and white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("weights the sRGB primaries by their WCAG luminance", () => {
    expect(contrastRatio("#FF0000", "#000000")).toBeCloseTo(0.2626 / 0.05, 3);
    expect(contrastRatio("#00FF00", "#000000")).toBeCloseTo(0.7652 / 0.05, 3);
    expect(contrastRatio("#0000FF", "#000000")).toBeCloseTo(0.1222 / 0.05, 3);
  });

  it("rejects a string that is not #RRGGBB", () => {
    expect(() => contrastRatio("#FFF", "#000000")).toThrow();
    expect(() => contrastRatio("C09900", "#000000")).toThrow();
    expect(() => contrastRatio("not-a-hex", "#000000")).toThrow();
  });
});
