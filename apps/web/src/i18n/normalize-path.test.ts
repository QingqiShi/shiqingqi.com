import { describe, it, expect } from "vitest";
import { normalizePath } from "./normalize-path";

describe("normalizePath", () => {
  it("removes locale prefix from pathname", () => {
    expect(normalizePath("/en/about")).toBe("/about");
    expect(normalizePath("/zh/about")).toBe("/about");
  });

  it("handles root path with locale", () => {
    expect(normalizePath("/en")).toBe("/");
    expect(normalizePath("/zh")).toBe("/");
    expect(normalizePath("/en/")).toBe("/");
    expect(normalizePath("/zh/")).toBe("/");
  });

  it("removes trailing slash", () => {
    expect(normalizePath("/about/")).toBe("/about");
    expect(normalizePath("/en/about/")).toBe("/about");
  });

  it("preserves root slash", () => {
    expect(normalizePath("/")).toBe("/");
  });

  it("handles null pathname", () => {
    expect(normalizePath(null)).toBe("");
  });

  it("handles paths without locale", () => {
    expect(normalizePath("/about")).toBe("/about");
    expect(normalizePath("/products/item")).toBe("/products/item");
  });
});
