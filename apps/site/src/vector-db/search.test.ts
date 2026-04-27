import type { QueryResult } from "@upstash/vector";
import { describe, expect, it } from "vitest";
import { buildFilterString, mapQueryResult } from "./search";
import type { MediaMetadata } from "./types";
import { vectorSearchFiltersSchema } from "./types";

describe("buildFilterString", () => {
  it("returns undefined for empty filters", () => {
    expect(buildFilterString({})).toBeUndefined();
  });

  it("filters by mediaType", () => {
    expect(buildFilterString({ mediaType: "movie" })).toBe(
      'mediaType = "movie"',
    );
  });

  it("filters by single genreId", () => {
    expect(buildFilterString({ genreIds: [35] })).toBe("genreIds CONTAINS 35");
  });

  it("filters by multiple genreIds with AND", () => {
    expect(buildFilterString({ genreIds: [35, 18] })).toBe(
      "genreIds CONTAINS 35 AND genreIds CONTAINS 18",
    );
  });

  it("filters by releaseYearMin", () => {
    expect(buildFilterString({ releaseYearMin: 2020 })).toBe(
      "releaseYear >= 2020",
    );
  });

  it("filters by releaseYearMax", () => {
    expect(buildFilterString({ releaseYearMax: 1999 })).toBe(
      "releaseYear <= 1999",
    );
  });

  it("filters by year range", () => {
    expect(
      buildFilterString({ releaseYearMin: 1990, releaseYearMax: 1999 }),
    ).toBe("releaseYear >= 1990 AND releaseYear <= 1999");
  });

  it("filters by voteAverageMin", () => {
    expect(buildFilterString({ voteAverageMin: 7.5 })).toBe(
      "voteAverage >= 7.5",
    );
  });

  it("filters by originalLanguage", () => {
    expect(buildFilterString({ originalLanguage: "en" })).toBe(
      'originalLanguage = "en"',
    );
  });

  it("filters by directorIds", () => {
    expect(buildFilterString({ directorIds: [525] })).toBe(
      "directorIds CONTAINS 525",
    );
  });

  it("filters by multiple directorIds", () => {
    expect(buildFilterString({ directorIds: [525, 7467] })).toBe(
      "directorIds CONTAINS 525 AND directorIds CONTAINS 7467",
    );
  });

  it("filters by castIds", () => {
    expect(buildFilterString({ castIds: [6193] })).toBe(
      "castIds CONTAINS 6193",
    );
  });

  it("filters by multiple castIds", () => {
    expect(buildFilterString({ castIds: [6193, 2524] })).toBe(
      "castIds CONTAINS 6193 AND castIds CONTAINS 2524",
    );
  });

  it("filters by streamingPlatforms", () => {
    expect(buildFilterString({ streamingPlatforms: ["Netflix"] })).toBe(
      'streamingPlatforms CONTAINS "Netflix"',
    );
  });

  it("combines multiple filter types with AND", () => {
    expect(
      buildFilterString({
        mediaType: "movie",
        genreIds: [878],
        releaseYearMin: 2020,
        voteAverageMin: 7.0,
      }),
    ).toBe(
      'mediaType = "movie" AND genreIds CONTAINS 878 AND releaseYear >= 2020 AND voteAverage >= 7',
    );
  });

  it("strips double quotes from streaming platform values", () => {
    expect(
      buildFilterString({
        streamingPlatforms: ['test" OR category = "actor'],
      }),
    ).toBe('streamingPlatforms CONTAINS "test OR category = actor"');
  });

  it("preserves single quotes in streaming platform values", () => {
    expect(buildFilterString({ streamingPlatforms: ["Lupita's Stream"] })).toBe(
      'streamingPlatforms CONTAINS "Lupita\'s Stream"',
    );
  });
});

describe("vectorSearchFiltersSchema", () => {
  it("accepts valid filters", () => {
    const result = vectorSearchFiltersSchema.parse({
      mediaType: "movie",
      genreIds: [28, 12],
      releaseYearMin: 2020,
      voteAverageMin: 7.0,
      castIds: [6193],
    });
    expect(result.mediaType).toBe("movie");
    expect(result.genreIds).toEqual([28, 12]);
  });

  it("accepts empty object", () => {
    const result = vectorSearchFiltersSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid mediaType", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ mediaType: "anime" }),
    ).toThrow();
  });

  it("rejects non-integer genreIds", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ genreIds: [1.5] }),
    ).toThrow();
  });

  it("rejects non-integer releaseYearMin", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ releaseYearMin: 2020.5 }),
    ).toThrow();
  });

  it("accepts valid ISO 639-1 originalLanguage", () => {
    const result = vectorSearchFiltersSchema.parse({ originalLanguage: "en" });
    expect(result.originalLanguage).toBe("en");
  });

  it("rejects invalid originalLanguage format", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ originalLanguage: "english" }),
    ).toThrow();
    expect(() =>
      vectorSearchFiltersSchema.parse({
        originalLanguage: "' OR 1=1 --",
      }),
    ).toThrow();
  });

  it("rejects non-integer directorIds", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ directorIds: [1.5] }),
    ).toThrow();
  });

  it("rejects non-integer castIds", () => {
    expect(() => vectorSearchFiltersSchema.parse({ castIds: [1.5] })).toThrow();
  });

  it("rejects overly long streaming platform names", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({
        streamingPlatforms: ["a".repeat(101)],
      }),
    ).toThrow();
  });
});

describe("mapQueryResult", () => {
  const sampleMetadata: MediaMetadata = {
    tmdbId: 27205,
    mediaType: "movie",
    title: "Inception",
    originalTitle: "Inception",
    overview: "A mind-bending thriller",
    genreIds: [28, 878, 53],
    releaseYear: 2010,
    voteAverage: 8.4,
    voteCount: 35000,
    popularity: 100,
    posterPath: "/poster.jpg",
    originalLanguage: "en",
    directorIds: [525],
    directors: ["Christopher Nolan"],
    castIds: [6193],
    cast: ["Leonardo DiCaprio"],
    streamingPlatforms: ["Netflix"],
  };

  it("maps a full query result to VectorSearchResult", () => {
    const queryResult: QueryResult<MediaMetadata> = {
      id: "movie-27205",
      score: 0.92,
      metadata: sampleMetadata,
    };
    const result = mapQueryResult(queryResult);
    expect(result).toEqual({
      id: "movie-27205",
      score: 0.92,
      tmdbId: 27205,
      mediaType: "movie",
      title: "Inception",
      overview: "A mind-bending thriller",
      releaseYear: 2010,
      voteAverage: 8.4,
      posterPath: "/poster.jpg",
      genreIds: [28, 878, 53],
      directors: ["Christopher Nolan"],
      cast: ["Leonardo DiCaprio"],
      streamingPlatforms: ["Netflix"],
    });
  });

  it("returns null when metadata is missing", () => {
    const queryResult: QueryResult<MediaMetadata> = {
      id: "movie-27205",
      score: 0.92,
    };
    expect(mapQueryResult(queryResult)).toBeNull();
  });

  it("converts numeric id to string", () => {
    const queryResult: QueryResult<MediaMetadata> = {
      id: 27205,
      score: 0.85,
      metadata: sampleMetadata,
    };
    const result = mapQueryResult(queryResult);
    expect(result?.id).toBe("27205");
  });

  it("handles null posterPath", () => {
    const queryResult: QueryResult<MediaMetadata> = {
      id: "tv-12345",
      score: 0.78,
      metadata: { ...sampleMetadata, posterPath: null },
    };
    const result = mapQueryResult(queryResult);
    expect(result?.posterPath).toBeNull();
  });
});
