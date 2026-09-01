import { describe, expect, it } from "vitest";
import { mapToolOutputToMediaItems } from "./map-tool-output-to-media-items";

describe("mapToolOutputToMediaItems", () => {
  describe("tmdb_search", () => {
    it("maps movie results", () => {
      const output = [
        {
          id: 1,
          media_type: "movie",
          title: "Inception",
          poster_path: "/inception.jpg",
          vote_average: 8.4,
          overview: "A mind-bending thriller",
        },
      ];

      const items = mapToolOutputToMediaItems("tmdb_search", output);

      expect(items).toEqual([
        {
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        },
      ]);
    });

    it("maps TV results using name field", () => {
      const output = [
        {
          id: 2,
          media_type: "tv",
          name: "Breaking Bad",
          poster_path: "/bb.jpg",
          vote_average: 9.5,
        },
      ];

      const items = mapToolOutputToMediaItems("tmdb_search", output);

      expect(items).toEqual([
        {
          id: 2,
          title: "Breaking Bad",
          posterPath: "/bb.jpg",
          rating: 9.5,
          mediaType: "tv",
        },
      ]);
    });

    it("filters out person results", () => {
      const output = [
        {
          id: 1,
          media_type: "movie",
          title: "Inception",
          poster_path: "/inception.jpg",
          vote_average: 8.4,
        },
        {
          id: 3,
          media_type: "person",
          name: "Christopher Nolan",
        },
      ];

      const items = mapToolOutputToMediaItems("tmdb_search", output);

      expect(items).toHaveLength(1);
      expect(items[0]?.title).toBe("Inception");
    });

    it("returns empty array for non-array input", () => {
      expect(mapToolOutputToMediaItems("tmdb_search", null)).toEqual([]);
      expect(mapToolOutputToMediaItems("tmdb_search", "string")).toEqual([]);
      expect(mapToolOutputToMediaItems("tmdb_search", 42)).toEqual([]);
      expect(mapToolOutputToMediaItems("tmdb_search", undefined)).toEqual([]);
    });

    it("skips entries without numeric id", () => {
      const output = [
        { id: "not-a-number", media_type: "movie", title: "Bad" },
        { media_type: "movie", title: "No ID" },
      ];

      expect(mapToolOutputToMediaItems("tmdb_search", output)).toEqual([]);
    });

    it("handles missing optional fields", () => {
      const output = [{ id: 5, media_type: "movie" }];

      const items = mapToolOutputToMediaItems("tmdb_search", output);

      expect(items).toEqual([
        {
          id: 5,
          title: undefined,
          posterPath: null,
          rating: null,
          mediaType: "movie",
        },
      ]);
    });
  });

  describe("semantic_search", () => {
    it("maps semantic search results", () => {
      const output = [
        {
          id: "vec-1",
          score: 0.95,
          tmdbId: 100,
          mediaType: "movie",
          title: "Interstellar",
          posterPath: "/interstellar.jpg",
          voteAverage: 8.7,
          overview: "Space exploration",
        },
      ];

      const items = mapToolOutputToMediaItems("semantic_search", output);

      expect(items).toEqual([
        {
          id: 100,
          title: "Interstellar",
          posterPath: "/interstellar.jpg",
          rating: 8.7,
          mediaType: "movie",
        },
      ]);
    });

    it("maps TV results from semantic search", () => {
      const output = [
        {
          id: "vec-2",
          score: 0.88,
          tmdbId: 200,
          mediaType: "tv",
          title: "Dark",
          posterPath: "/dark.jpg",
          voteAverage: 8.8,
        },
      ];

      const items = mapToolOutputToMediaItems("semantic_search", output);

      expect(items).toEqual([
        {
          id: 200,
          title: "Dark",
          posterPath: "/dark.jpg",
          rating: 8.8,
          mediaType: "tv",
        },
      ]);
    });

    it("returns empty array for non-array input", () => {
      expect(mapToolOutputToMediaItems("semantic_search", {})).toEqual([]);
      expect(mapToolOutputToMediaItems("semantic_search", null)).toEqual([]);
    });

    it("skips entries without numeric tmdbId", () => {
      const output = [{ tmdbId: "abc", mediaType: "movie", title: "Bad" }];

      expect(mapToolOutputToMediaItems("semantic_search", output)).toEqual([]);
    });
  });

  describe("person_credits", () => {
    it("maps person credits results", () => {
      const output = [
        {
          id: 27205,
          media_type: "movie",
          title: "Inception",
          poster_path: "/inception.jpg",
          vote_average: 8.4,
        },
      ];

      const items = mapToolOutputToMediaItems("person_credits", output);

      expect(items).toEqual([
        {
          id: 27205,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        },
      ]);
    });

    it("maps TV results from person credits", () => {
      const output = [
        {
          id: 1399,
          media_type: "tv",
          title: "Breaking Bad",
          poster_path: "/bb.jpg",
          vote_average: 9.5,
        },
      ];

      const items = mapToolOutputToMediaItems("person_credits", output);

      expect(items).toEqual([
        {
          id: 1399,
          title: "Breaking Bad",
          posterPath: "/bb.jpg",
          rating: 9.5,
          mediaType: "tv",
        },
      ]);
    });

    it("returns empty array for non-array input", () => {
      expect(mapToolOutputToMediaItems("person_credits", null)).toEqual([]);
      expect(mapToolOutputToMediaItems("person_credits", {})).toEqual([]);
      expect(mapToolOutputToMediaItems("person_credits", "string")).toEqual([]);
    });

    it("skips entries without numeric id", () => {
      const output = [
        { id: "not-a-number", media_type: "movie", title: "Bad" },
        { media_type: "movie", title: "No ID" },
      ];

      expect(mapToolOutputToMediaItems("person_credits", output)).toEqual([]);
    });

    it("handles missing optional fields", () => {
      const output = [{ id: 5 }];

      const items = mapToolOutputToMediaItems("person_credits", output);

      expect(items).toEqual([
        {
          id: 5,
          title: undefined,
          posterPath: null,
          rating: null,
          mediaType: null,
        },
      ]);
    });

    it("handles entries with unknown media_type", () => {
      const output = [
        {
          id: 1,
          media_type: "unknown",
          title: "Test",
          poster_path: "/test.jpg",
          vote_average: 7.0,
        },
      ];

      const items = mapToolOutputToMediaItems("person_credits", output);

      expect(items).toEqual([
        {
          id: 1,
          title: "Test",
          posterPath: "/test.jpg",
          rating: 7.0,
          mediaType: null,
        },
      ]);
    });
  });

  describe("unknown tool", () => {
    it("returns empty array for unknown tool names", () => {
      expect(mapToolOutputToMediaItems("unknown_tool", [{ id: 1 }])).toEqual(
        [],
      );
    });
  });
});
