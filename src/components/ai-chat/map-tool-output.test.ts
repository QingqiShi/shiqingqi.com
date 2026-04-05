import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import {
  accumulateToolOutputs,
  buildPersonResultsMap,
  buildSearchResultsMap,
  mapToolOutputToMediaItems,
  resolveMediaItems,
  resolvePersonItems,
} from "./map-tool-output";

function msg(
  parts: UIMessage["parts"],
  role: "user" | "assistant" = "assistant",
): UIMessage {
  return { id: `msg-${Math.random()}`, role, parts };
}

function toolPart(toolName: string, output: unknown) {
  return {
    type: "dynamic-tool" as const,
    toolName,
    toolCallId: `call-${Math.random()}`,
    state: "output-available" as const,
    input: {},
    output,
  };
}

describe("accumulateToolOutputs", () => {
  it("returns empty maps for no messages", () => {
    const result = accumulateToolOutputs([]);
    expect(result.searchResultsMap.size).toBe(0);
    expect(result.personResultsMap.size).toBe(0);
    expect(result.watchProvidersMap.size).toBe(0);
  });

  it("accumulates search results from tmdb_search across messages", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "Inception",
            poster_path: "/a.jpg",
            vote_average: 8.4,
          },
        ]),
      ]),
      msg([
        toolPart("tmdb_search", [
          {
            id: 2,
            media_type: "tv",
            title: "Dark",
            poster_path: "/b.jpg",
            vote_average: 8.8,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(2);
    expect(result.searchResultsMap.get("movie:1")?.title).toBe("Inception");
    expect(result.searchResultsMap.get("tv:2")?.title).toBe("Dark");
  });

  it("accumulates person results from tmdb_search", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 10,
            media_type: "person",
            name: "Nolan",
            profile_path: "/nolan.jpg",
            known_for_department: "Directing",
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.personResultsMap.size).toBe(1);
    expect(result.personResultsMap.get(10)?.name).toBe("Nolan");
  });

  it("accumulates watch providers", () => {
    const messages = [
      msg([
        toolPart("watch_providers", {
          id: 550,
          mediaType: "movie",
          region: "US",
          providers: {
            link: null,
            flatrate: [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }],
            rent: [],
            buy: [],
            ads: [],
            free: [],
          },
        }),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.watchProvidersMap.size).toBe(1);
  });

  it("skips tool parts that are not output-available", () => {
    const messages = [
      msg([
        {
          type: "dynamic-tool" as const,
          toolName: "tmdb_search",
          toolCallId: "call-1",
          state: "input-available" as const,
          input: { query: "test" },
        },
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(0);
  });

  it("skips non-tool parts", () => {
    const messages = [
      msg([
        { type: "text" as const, text: "Hello" },
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "X",
            poster_path: "/x.jpg",
            vote_average: 7,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(1);
  });

  it("does not call buildWatchProvidersMap for non-watch_providers tools", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "X",
            poster_path: null,
            vote_average: 5,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.watchProvidersMap.size).toBe(0);
  });
});

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

describe("resolvePersonItems", () => {
  const personResults = new Map<number, PersonListItem>([
    [
      1,
      {
        id: 1,
        name: "Brad Pitt",
        profilePath: "/brad.jpg",
        knownForDepartment: "Acting",
      },
    ],
    [
      2,
      {
        id: 2,
        name: "David Fincher",
        profilePath: "/fincher.jpg",
        knownForDepartment: "Directing",
      },
    ],
  ]);

  it("resolves items in specified order", () => {
    const input = {
      people: [{ id: 2 }, { id: 1 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("David Fincher");
    expect(items[1]?.name).toBe("Brad Pitt");
  });

  it("creates fallback for missing IDs", () => {
    const input = { people: [{ id: 999 }] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([{ id: 999 }]);
  });

  it("handles mixed found and missing items", () => {
    const input = {
      people: [{ id: 1 }, { id: 999 }],
    };

    const items = resolvePersonItems(input, personResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.name).toBe("Brad Pitt");
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

  it("rejects entire input when any entry has invalid schema", () => {
    expect(
      resolvePersonItems({ people: [{ id: "abc" }] }, personResults),
    ).toEqual([]);
  });

  it("returns empty array for empty people list", () => {
    const input = { people: [] };

    const items = resolvePersonItems(input, personResults);

    expect(items).toEqual([]);
  });
});

describe("buildPersonResultsMap for media_credits", () => {
  it("extracts persons from { cast, crew } object format", () => {
    const output = {
      cast: [
        {
          id: 1,
          name: "Brad Pitt",
          profile_path: "/brad.jpg",
          known_for_department: "Acting",
          character: "Tyler Durden",
          order: 0,
        },
      ],
      crew: [
        {
          id: 2,
          name: "David Fincher",
          profile_path: "/fincher.jpg",
          known_for_department: "Directing",
          department: "Directing",
          job: "Director",
        },
      ],
    };

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(2);
    expect(map.get(1)?.name).toBe("Brad Pitt");
    expect(map.get(2)?.name).toBe("David Fincher");
  });

  it("deduplicates persons who appear in both cast and crew", () => {
    const output = {
      cast: [
        {
          id: 1,
          name: "Clint Eastwood",
          profile_path: "/clint.jpg",
          known_for_department: "Acting",
          character: "Walt Kowalski",
          order: 0,
        },
      ],
      crew: [
        {
          id: 1,
          name: "Clint Eastwood",
          profile_path: "/clint.jpg",
          known_for_department: "Directing",
          department: "Directing",
          job: "Director",
        },
      ],
    };

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(1);
    expect(map.get(1)?.name).toBe("Clint Eastwood");
  });

  it("handles legacy flat array format for backwards compatibility", () => {
    const output = [
      {
        id: 1,
        name: "Brad Pitt",
        profile_path: "/brad.jpg",
        known_for_department: "Acting",
      },
    ];

    const map = buildPersonResultsMap("media_credits", output);

    expect(map.size).toBe(1);
    expect(map.get(1)?.name).toBe("Brad Pitt");
  });

  it("returns empty map for non-object/non-array input", () => {
    expect(buildPersonResultsMap("media_credits", null).size).toBe(0);
    expect(buildPersonResultsMap("media_credits", "string").size).toBe(0);
    expect(buildPersonResultsMap("media_credits", 42).size).toBe(0);
  });

  it("handles empty cast and crew arrays", () => {
    const output = { cast: [], crew: [] };
    const map = buildPersonResultsMap("media_credits", output);
    expect(map.size).toBe(0);
  });
});
