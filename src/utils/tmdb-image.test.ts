import { describe, expect, it } from "vitest";
import { buildSrcSet } from "./tmdb-image";

describe("buildSrcSet", () => {
  const baseUrl = "https://image.tmdb.org/t/p/";
  const path = "/abc123.jpg";

  it("builds src and srcSet from width-based sizes", () => {
    const sizes = ["w92", "w185", "w500"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w500${path}`);
    expect(result.srcSet).toBe(
      `${baseUrl}w92${path} 92w, ${baseUrl}w185${path} 185w, ${baseUrl}w500${path} 500w`,
    );
  });

  it("uses the last width entry as the src fallback", () => {
    const sizes = ["w92", "w342", "w780"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w780${path}`);
  });

  it("falls back to original when no width-based sizes exist", () => {
    const sizes = ["original"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}original${path}`);
    expect(result.srcSet).toBe("");
  });

  it("falls back to original when sizes array is empty", () => {
    const result = buildSrcSet(baseUrl, [], path);

    expect(result.src).toBe(`${baseUrl}original${path}`);
    expect(result.srcSet).toBe("");
  });

  it("filters out non-width entries like 'original'", () => {
    const sizes = ["w92", "original", "w500"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.srcSet).toBe(
      `${baseUrl}w92${path} 92w, ${baseUrl}w500${path} 500w`,
    );
  });

  it("handles a single width-based size", () => {
    const sizes = ["w342"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w342${path}`);
    expect(result.srcSet).toBe(`${baseUrl}w342${path} 342w`);
  });

  it("handles realistic TMDB poster sizes", () => {
    const sizes = ["w92", "w154", "w185", "w342", "w500", "w780", "original"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w780${path}`);
    expect(result.srcSet).toContain("92w");
    expect(result.srcSet).toContain("154w");
    expect(result.srcSet).toContain("185w");
    expect(result.srcSet).toContain("342w");
    expect(result.srcSet).toContain("500w");
    expect(result.srcSet).toContain("780w");
    expect(result.srcSet).not.toContain("original");
  });

  it("handles realistic TMDB backdrop sizes", () => {
    const sizes = ["w300", "w780", "w1280", "original"];
    const result = buildSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w1280${path}`);
    expect(result.srcSet).toBe(
      `${baseUrl}w300${path} 300w, ${baseUrl}w780${path} 780w, ${baseUrl}w1280${path} 1280w`,
    );
  });
});
