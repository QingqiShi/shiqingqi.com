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

describe("mapToolOutputToMediaItems - person_credits", () => {
  it("maps person credit entries to media items", () => {
    const output = [
      {
        id: 10,
        media_type: "movie",
        title: "Inception",
        poster_path: "/inception.jpg",
        vote_average: 8.4,
        release_date: "2010-07-16",
        character: "Cobb",
      },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 10,
        title: "Inception",
        posterPath: "/inception.jpg",
        rating: 8.4,
        mediaType: "movie",
      },
    ]);
  });

  it("maps TV credit entries using title field", () => {
    const output = [
      {
        id: 20,
        media_type: "tv",
        title: "Breaking Bad",
        poster_path: "/bb.jpg",
        vote_average: 9.5,
      },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 20,
        title: "Breaking Bad",
        posterPath: "/bb.jpg",
        rating: 9.5,
        mediaType: "tv",
      },
    ]);
  });

  it("handles entries with missing optional fields", () => {
    const output = [{ id: 30, media_type: "movie" }];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 30,
        title: undefined,
        posterPath: null,
        rating: null,
        mediaType: "movie",
      },
    ]);
  });

  it("returns empty array for non-array input", () => {
    expect(mapToolOutputToMediaItems("person_credits", null)).toEqual([]);
    expect(mapToolOutputToMediaItems("person_credits", "string")).toEqual([]);
    expect(mapToolOutputToMediaItems("person_credits", 42)).toEqual([]);
    expect(mapToolOutputToMediaItems("person_credits", {})).toEqual([]);
  });

  it("skips entries without numeric id", () => {
    const output = [
      { id: "not-a-number", media_type: "movie", title: "Bad" },
      { media_type: "movie", title: "No ID" },
    ];

    expect(mapToolOutputToMediaItems("person_credits", output)).toEqual([]);
  });

  it("sets mediaType to null for entries with unrecognized media_type", () => {
    const output = [{ id: 40, media_type: "unknown", title: "Something" }];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toEqual([
      {
        id: 40,
        title: "Something",
        posterPath: null,
        rating: null,
        mediaType: null,
      },
    ]);
  });

  it("skips non-record entries", () => {
    const output = [
      null,
      undefined,
      "string",
      42,
      true,
      { id: 50, media_type: "movie" },
    ];

    const items = mapToolOutputToMediaItems("person_credits", output);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe(50);
  });
});

describe("buildPersonResultsMap", () => {
  describe("tmdb_search", () => {
    it("extracts person results from tmdb_search output", () => {
      const output = [
        {
          id: 1,
          media_type: "movie",
          title: "Inception",
          poster_path: "/inception.jpg",
          vote_average: 8.4,
        },
        {
          id: 100,
          media_type: "person",
          name: "Christopher Nolan",
          profile_path: "/nolan.jpg",
          known_for_department: "Directing",
        },
        {
          id: 200,
          media_type: "person",
          name: "Tom Hardy",
          profile_path: "/hardy.jpg",
          known_for_department: "Acting",
        },
      ];

      const map = buildPersonResultsMap("tmdb_search", output);

      expect(map.size).toBe(2);
      expect(map.get(100)).toEqual({
        id: 100,
        name: "Christopher Nolan",
        profilePath: "/nolan.jpg",
        knownForDepartment: "Directing",
      });
      expect(map.get(200)).toEqual({
        id: 200,
        name: "Tom Hardy",
        profilePath: "/hardy.jpg",
        knownForDepartment: "Acting",
      });
    });

    it("filters out non-person results", () => {
      const output = [
        { id: 1, media_type: "movie", title: "Inception" },
        { id: 2, media_type: "tv", name: "Breaking Bad" },
      ];

      const map = buildPersonResultsMap("tmdb_search", output);

      expect(map.size).toBe(0);
    });

    it("handles person entries with missing optional fields", () => {
      const output = [
        {
          id: 300,
          media_type: "person",
        },
      ];

      const map = buildPersonResultsMap("tmdb_search", output);

      expect(map.size).toBe(1);
      expect(map.get(300)).toEqual({
        id: 300,
        name: null,
        profilePath: null,
        knownForDepartment: null,
      });
    });

    it("returns empty map for non-array input", () => {
      expect(buildPersonResultsMap("tmdb_search", null).size).toBe(0);
      expect(buildPersonResultsMap("tmdb_search", "string").size).toBe(0);
    });
  });

  describe("media_credits", () => {
    it("extracts person entries from media_credits output", () => {
      const output = [
        {
          id: 500,
          name: "Leonardo DiCaprio",
          profile_path: "/leo.jpg",
          known_for_department: "Acting",
          character: "Cobb",
          order: 0,
        },
        {
          id: 600,
          name: "Joseph Gordon-Levitt",
          profile_path: "/jgl.jpg",
          known_for_department: "Acting",
          character: "Arthur",
          order: 1,
        },
      ];

      const map = buildPersonResultsMap("media_credits", output);

      expect(map.size).toBe(2);
      expect(map.get(500)).toEqual({
        id: 500,
        name: "Leonardo DiCaprio",
        profilePath: "/leo.jpg",
        knownForDepartment: "Acting",
      });
      expect(map.get(600)).toEqual({
        id: 600,
        name: "Joseph Gordon-Levitt",
        profilePath: "/jgl.jpg",
        knownForDepartment: "Acting",
      });
    });

    it("handles entries with missing optional fields", () => {
      const output = [
        {
          id: 700,
        },
      ];

      const map = buildPersonResultsMap("media_credits", output);

      expect(map.size).toBe(1);
      expect(map.get(700)).toEqual({
        id: 700,
        name: null,
        profilePath: null,
        knownForDepartment: null,
      });
    });

    it("skips entries without numeric id", () => {
      const output = [{ id: "not-a-number", name: "Bad" }, { name: "No ID" }];

      const map = buildPersonResultsMap("media_credits", output);

      expect(map.size).toBe(0);
    });

    it("returns empty map for non-array input", () => {
      expect(buildPersonResultsMap("media_credits", null).size).toBe(0);
      expect(buildPersonResultsMap("media_credits", {}).size).toBe(0);
    });
  });

  it("returns empty map for unknown tool name", () => {
    const output = [{ id: 1, name: "Test" }];
    expect(buildPersonResultsMap("unknown_tool", output).size).toBe(0);
  });
});

describe("resolvePersonItems", () => {
  const personResults = new Map<number, PersonListItem>([
    [
      100,
      {
        id: 100,
        name: "Christopher Nolan",
        profilePath: "/nolan.jpg",
        knownForDepartment: "Directing",
      },
    ],
    [
      200,
      {
        id: 200,
        name: "Tom Hardy",
        profilePath: "/hardy.jpg",
        knownForDepartment: "Acting",
      },
    ],
  ]);

  it("resolves items in specified order from person results map", () => {
    const input = {
      people: [{ id: 200 }, { id: 100 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Tom Hardy");
    expect(items[1]?.name).toBe("Christopher Nolan");
  });

  it("creates fallback for person IDs not in the map", () => {
    const input = { people: [{ id: 999 }] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([{ id: 999 }]);
  });

  it("handles a mix of found and missing person items", () => {
    const input = {
      people: [{ id: 100 }, { id: 999 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Christopher Nolan");
    expect(items[1]).toEqual({ id: 999 });
  });

  it("returns empty array for invalid input", () => {
    expect(resolvePersonItems(null, personResults)).toEqual([]);
    expect(resolvePersonItems("string", personResults)).toEqual([]);
    expect(resolvePersonItems({}, personResults)).toEqual([]);
    expect(resolvePersonItems({ people: "not-array" }, personResults)).toEqual(
      [],
    );
  });

  it("rejects input when entries have invalid schema", () => {
    expect(
      resolvePersonItems({ people: [{ id: "abc" }] }, personResults),
    ).toEqual([]);
  });

  it("resolves empty people array", () => {
    const input = { people: [] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([]);
  });
});
