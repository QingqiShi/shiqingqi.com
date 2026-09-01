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

  it("matches a known mid-tone case (Yellow 50 on white ~2.69)", () => {
    expect(contrastRatio("#C09900", "#FFFFFF")).toBeCloseTo(2.69, 1);
  });
});
