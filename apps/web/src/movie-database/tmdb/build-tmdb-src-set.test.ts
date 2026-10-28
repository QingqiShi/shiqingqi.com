import { describe, expect, it } from "vitest";
import { buildTmdbSrcSet } from "./build-tmdb-src-set";

describe("buildTmdbSrcSet", () => {
  const baseUrl = "https://image.tmdb.org/t/p/";
  const path = "/abc123.jpg";

  it("builds src and srcSet from width-based sizes", () => {
    const sizes = ["w92", "w185", "w500"];
    const result = buildTmdbSrcSet(baseUrl, sizes, path);

    expect(result.src).toBe(`${baseUrl}w500${path}`);
    expect(result.srcSet).toBe(
      `${baseUrl}w92${path} 92w, ${baseUrl}w185${path} 185w, ${baseUrl}w500${path} 500w`,
    );
  });

  it("falls back to original when sizes array is empty", () => {
    const result = buildTmdbSrcSet(baseUrl, [], path);

    expect(result.src).toBe(`${baseUrl}original${path}`);
    expect(result.srcSet).toBe("");
  });

  it("filters out non-width entries like 'original'", () => {
    const sizes = ["w92", "original", "w500"];
    const result = buildTmdbSrcSet(baseUrl, sizes, path);

    expect(result.srcSet).toBe(
      `${baseUrl}w92${path} 92w, ${baseUrl}w500${path} 500w`,
    );
  });
});
