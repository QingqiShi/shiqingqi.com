import { describe, expect, it } from "vitest";
import { artPxToCssPx } from "./art-px-to-css-px";

describe("artPxToCssPx", () => {
  it("scales art-pixel values to CSS pixels", () => {
    expect(artPxToCssPx(2, 8)).toBe(16);
    expect(artPxToCssPx(0, 8)).toBe(0);
  });
});
