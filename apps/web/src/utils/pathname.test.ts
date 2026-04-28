import { describe, it, expect } from "vitest";
import { normalizePath, getLocalePath } from "./pathname";

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
