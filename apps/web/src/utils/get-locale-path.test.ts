import { describe, it, expect } from "vitest";
import { getLocalePath } from "./get-locale-path";

describe("getLocalePath", () => {
  it("returns normalized path for default locale", () => {
    expect(getLocalePath("/en/about", "en", "en")).toBe("/about");
    expect(getLocalePath("/about", "en", "en")).toBe("/about");
  });

  it("adds locale prefix for non-default locale", () => {
    expect(getLocalePath("/about", "zh", "en")).toBe("/zh/about");
    expect(getLocalePath("/en/about", "zh", "en")).toBe("/zh/about");
  });

  it("handles root path correctly", () => {
    expect(getLocalePath("/", "en", "en")).toBe("/");
    expect(getLocalePath("/", "zh", "en")).toBe("/zh");
    expect(getLocalePath("/en", "zh", "en")).toBe("/zh");
  });

  it("removes existing locale and adds new one", () => {
    expect(getLocalePath("/en/products", "zh", "en")).toBe("/zh/products");
    expect(getLocalePath("/zh/products", "en", "en")).toBe("/products");
  });

  it("handles null pathname", () => {
    expect(getLocalePath(null, "en", "en")).toBe("");
    expect(getLocalePath(null, "zh", "en")).toBe("/zh");
  });
});
