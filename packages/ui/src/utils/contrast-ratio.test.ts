import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast-ratio.ts";

describe("contrastRatio", () => {
  it("is 21 between black and white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
  });

  it("is symmetric", () => {
    const a = contrastRatio("#3F8EFF", "#101010");
    const b = contrastRatio("#101010", "#3F8EFF");
    expect(a).toBeCloseTo(b, 6);
  });

  it("weights the sRGB primaries by their WCAG luminance", () => {
    expect(contrastRatio("#FF0000", "#000000")).toBeCloseTo(0.2626 / 0.05, 3);
    expect(contrastRatio("#00FF00", "#000000")).toBeCloseTo(0.7652 / 0.05, 3);
    expect(contrastRatio("#0000FF", "#000000")).toBeCloseTo(0.1222 / 0.05, 3);
  });

  it("matches a known mid-tone case (Yellow 50 on white ~2.69)", () => {
    expect(contrastRatio("#C09900", "#FFFFFF")).toBeCloseTo(2.69, 1);
  });

  it("gives channels the same ratio as the hex they spell", () => {
    expect(contrastRatio([192, 153, 0], [255, 255, 255])).toBe(
      contrastRatio("#C09900", "#FFFFFF"),
    );
  });

  it("rejects a string that is not #RRGGBB", () => {
    expect(() => contrastRatio("#FFF", "#000000")).toThrow();
    expect(() => contrastRatio("C09900", "#000000")).toThrow();
    expect(() => contrastRatio("not-a-hex", "#000000")).toThrow();
  });
});
