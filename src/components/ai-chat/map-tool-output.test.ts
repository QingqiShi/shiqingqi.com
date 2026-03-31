import { describe, expect, it } from "vitest";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import {
  buildPersonResultsMap,
  buildSearchResultsMap,
  mapToolOutputToMediaItems,
  resolveMediaItems,
  resolvePersonItems,
} from "./map-tool-output";

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

  describe("unknown tool", () => {
    it("returns empty array for unknown tool names", () => {
      expect(mapToolOutputToMediaItems("unknown_tool", [{ id: 1 }])).toEqual(
        [],
      );
    });
  });
});

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

describe("resolveMediaItems", () => {
  const searchResults = new Map<string, MediaListItem>([
    [
      "movie:1",
      {
        id: 1,
        title: "Inception",
        posterPath: "/inception.jpg",
        rating: 8.4,
        mediaType: "movie",
      },
    ],
    [
      "tv:2",
      {
        id: 2,
        title: "Breaking Bad",
        posterPath: "/bb.jpg",
        rating: 9.5,
        mediaType: "tv",
      },
    ],
  ]);

  it("resolves items in specified order", () => {
    const input = {
      media: [
        { id: 2, media_type: "tv" },
        { id: 1, media_type: "movie" },
      ],
    };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe("Breaking Bad");
    expect(items[1]?.title).toBe("Inception");
  });

  it("creates fallback for missing IDs", () => {
    const input = { media: [{ id: 999, media_type: "movie" }] };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toEqual([{ id: 999, mediaType: "movie" }]);
  });

  it("handles mixed found and missing items", () => {
    const input = {
      media: [
        { id: 1, media_type: "movie" },
        { id: 999, media_type: "tv" },
      ],
    };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe("Inception");
    expect(items[1]).toEqual({ id: 999, mediaType: "tv" });
  });

  it("returns empty for invalid input", () => {
    expect(resolveMediaItems(null, searchResults)).toEqual([]);
    expect(resolveMediaItems("string", searchResults)).toEqual([]);
    expect(resolveMediaItems({}, searchResults)).toEqual([]);
    expect(resolveMediaItems({ media: "not-array" }, searchResults)).toEqual(
      [],
    );
  });

  it("rejects entire input when any entry has invalid schema", () => {
    expect(
      resolveMediaItems(
        { media: [{ id: "abc", media_type: "movie" }] },
        searchResults,
      ),
    ).toEqual([]);

    expect(
      resolveMediaItems(
        { media: [{ id: 1, media_type: "person" }] },
        searchResults,
      ),
    ).toEqual([]);
  });
});

describe("mapToolOutputToMediaItems — person_credits", () => {
  it("maps person credits output with movie entries", () => {
    const output = [
      {
        id: 550,
        media_type: "movie",
        title: "Fight Club",
        poster_path: "/fc.jpg",
        vote_average: 8.4,
      },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 550,
        title: "Fight Club",
        posterPath: "/fc.jpg",
        rating: 8.4,
        mediaType: "movie",
      },
    ]);
  });

  it("maps person credits output with TV entries", () => {
    const output = [
      {
        id: 1396,
        media_type: "tv",
        title: "Breaking Bad",
        poster_path: "/bb.jpg",
        vote_average: 9.5,
      },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 1396,
        title: "Breaking Bad",
        posterPath: "/bb.jpg",
        rating: 9.5,
        mediaType: "tv",
      },
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(mapToolOutputToMediaItems("person_credits", null)).toEqual([]);
    expect(mapToolOutputToMediaItems("person_credits", "string")).toEqual([]);
    expect(mapToolOutputToMediaItems("person_credits", {})).toEqual([]);
  });

  it("skips entries without numeric id", () => {
    const output = [
      { id: "abc", media_type: "movie", title: "Bad Entry" },
      { media_type: "movie", title: "No ID" },
    ];

    expect(mapToolOutputToMediaItems("person_credits", output)).toEqual([]);
  });

  it("handles missing optional fields", () => {
    const output = [{ id: 42 }];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 42,
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
        media_type: "person",
        title: "Should have null mediaType",
        vote_average: 5,
      },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 1,
        title: "Should have null mediaType",
        posterPath: null,
        rating: 5,
        mediaType: null,
      },
    ]);
  });

  it("skips non-record entries", () => {
    const output = [null, undefined, 42, "string", true, { id: 1 }];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(1);
  });
});

describe("buildPersonResultsMap", () => {
  it("builds map from tmdb_search person results keyed by id", () => {
    const output = [
      {
        id: 1,
        media_type: "movie",
        title: "Inception",
      },
      {
        id: 500,
        media_type: "person",
        name: "Tom Cruise",
        profile_path: "/tc.jpg",
        known_for_department: "Acting",
      },
      {
        id: 501,
        media_type: "person",
        name: "Christopher Nolan",
        profile_path: "/cn.jpg",
        known_for_department: "Directing",
      },
    ];

    const map = buildPersonResultsMap("tmdb_search", output);

    expect(map.size).toBe(2);
    expect(map.get(500)).toEqual({
      id: 500,
      name: "Tom Cruise",
      profilePath: "/tc.jpg",
      knownForDepartment: "Acting",
    });
    expect(map.get(501)).toEqual({
      id: 501,
      name: "Christopher Nolan",
      profilePath: "/cn.jpg",
      knownForDepartment: "Directing",
    });
  });

  it("filters out non-person entries from tmdb_search", () => {
    const output = [
      { id: 1, media_type: "movie", title: "Inception" },
      { id: 2, media_type: "tv", name: "Breaking Bad" },
    ];

    const map = buildPersonResultsMap("tmdb_search", output);

    expect(map.size).toBe(0);
  });

  it("builds map from media_credits output", () => {
    const output = [
      {
        id: 100,
        name: "Brad Pitt",
        profile_path: "/bp.jpg",
        known_for_department: "Acting",
      },
      {
        id: 101,
        name: "David Fincher",
        profile_path: "/df.jpg",
        known_for_department: "Directing",
      },
    ];

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(2);
    expect(map.get(100)).toEqual({
      id: 100,
      name: "Brad Pitt",
      profilePath: "/bp.jpg",
      knownForDepartment: "Acting",
    });
    expect(map.get(101)).toEqual({
      id: 101,
      name: "David Fincher",
      profilePath: "/df.jpg",
      knownForDepartment: "Directing",
    });
  });

  it("handles missing optional fields in media_credits", () => {
    const output = [{ id: 200 }];

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(1);
    expect(map.get(200)).toEqual({
      id: 200,
      name: null,
      profilePath: null,
      knownForDepartment: null,
    });
  });

  it("returns empty map for unknown tool name", () => {
    const map = buildPersonResultsMap("unknown_tool", [{ id: 1 }]);
    expect(map.size).toBe(0);
  });

  it("returns empty map for non-array input", () => {
    const map = buildPersonResultsMap("tmdb_search", null);
    expect(map.size).toBe(0);
  });

  it("skips entries without numeric id", () => {
    const output = [
      { id: "abc", media_type: "person", name: "Bad" },
      { media_type: "person", name: "No ID" },
    ];

    const map = buildPersonResultsMap("tmdb_search", output);
    expect(map.size).toBe(0);
  });

  it("deduplicates by id using last occurrence", () => {
    const output = [
      { id: 1, name: "First", profile_path: "/first.jpg" },
      { id: 1, name: "Second", profile_path: "/second.jpg" },
    ];

    const map = buildPersonResultsMap("media_credits", output);

    // Map constructor with duplicate keys keeps the last entry
    expect(map.size).toBe(1);
    expect(map.get(1)?.name).toBe("Second");
  });
});

describe("resolvePersonItems", () => {
  const personResults = new Map<number, PersonListItem>([
    [
      500,
      {
        id: 500,
        name: "Tom Cruise",
        profilePath: "/tc.jpg",
        knownForDepartment: "Acting",
      },
    ],
    [
      501,
      {
        id: 501,
        name: "Christopher Nolan",
        profilePath: "/cn.jpg",
        knownForDepartment: "Directing",
      },
    ],
  ]);

  it("resolves items in specified order", () => {
    const input = {
      people: [{ id: 501 }, { id: 500 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Christopher Nolan");
    expect(items[1]?.name).toBe("Tom Cruise");
  });

  it("creates fallback for missing IDs", () => {
    const input = { people: [{ id: 999 }] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([{ id: 999 }]);
  });

  it("handles mixed found and missing items", () => {
    const input = {
      people: [{ id: 500 }, { id: 999 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Tom Cruise");
    expect(items[1]).toEqual({ id: 999 });
  });

  it("returns empty for invalid input", () => {
    expect(resolvePersonItems(null, personResults)).toEqual([]);
    expect(resolvePersonItems("string", personResults)).toEqual([]);
    expect(resolvePersonItems({}, personResults)).toEqual([]);
    expect(resolvePersonItems({ people: "not-array" }, personResults)).toEqual(
      [],
    );
  });

  it("rejects input when any entry has invalid schema", () => {
    expect(
      resolvePersonItems({ people: [{ id: "abc" }] }, personResults),
    ).toEqual([]);
  });

  it("returns empty for empty people array", () => {
    const input = { people: [] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([]);
  });
});
