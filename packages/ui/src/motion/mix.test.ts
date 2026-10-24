import { describe, expect, it } from "vitest";
import { smoothstep } from "./mix.ts";

describe("smoothstep", () => {
  it("is 0 before its range, 1 after it, and smooth inside it", () => {
    expect(smoothstep(0.2, 0.6, 0.1)).toBe(0);
    expect(smoothstep(0.2, 0.6, 0.4)).toBeCloseTo(0.5);
    expect(smoothstep(0.2, 0.6, 0.9)).toBe(1);
  });
});
