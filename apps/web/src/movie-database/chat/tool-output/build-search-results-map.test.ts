import { describe, expect, it } from "vitest";
import { buildSearchResultsMap } from "./build-search-results-map";

describe("buildSearchResultsMap", () => {
  it("builds map keyed by mediaType:id", () => {
    const output = [
      {
        id: 1,
        media_type: "movie",
        title: "Inception",
        poster_path: "/inception.jpg",
        vote_average: 8.4,
      },
      {
        id: 2,
        media_type: "tv",
        name: "Breaking Bad",
        poster_path: "/bb.jpg",
        vote_average: 9.5,
      },
    ];

    const map = buildSearchResultsMap("tmdb_search", output);

    expect(map.size).toBe(2);
    expect(map.get("movie:1")?.title).toBe("Inception");
    expect(map.get("tv:2")?.title).toBe("Breaking Bad");
  });

  it("excludes items without mediaType", () => {
    const output = [{ id: 1 }];
    const map = buildSearchResultsMap("tmdb_search", output);
    expect(map.size).toBe(0);
  });

  it("returns empty map for unknown tool", () => {
    const map = buildSearchResultsMap("unknown", []);
    expect(map.size).toBe(0);
  });
});
