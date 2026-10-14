import { describe, expect, it } from "vitest";
import { largestDeclaredSize } from "./icon-candidate.ts";

describe("largestDeclaredSize", () => {
  it("takes the largest square edge", () => {
    expect(largestDeclaredSize("16x16 32X32 any")).toBe(32);
    expect(largestDeclaredSize("192x96")).toBe(96);
    expect(largestDeclaredSize("any")).toBe(0);
    expect(largestDeclaredSize(undefined)).toBe(0);
  });
});
