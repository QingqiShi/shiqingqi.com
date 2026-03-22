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
      "mediaType = 'movie'",
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
      "originalLanguage = 'en'",
    );
  });

  it("filters by directors", () => {
    expect(buildFilterString({ directors: ["Christopher Nolan"] })).toBe(
      "directors CONTAINS 'Christopher Nolan'",
    );
  });

  it("filters by cast", () => {
    expect(buildFilterString({ cast: ["Leonardo DiCaprio"] })).toBe(
      "cast CONTAINS 'Leonardo DiCaprio'",
    );
  });

  it("filters by multiple cast members", () => {
    expect(
      buildFilterString({
        cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt"],
      }),
    ).toBe(
      "cast CONTAINS 'Leonardo DiCaprio' AND cast CONTAINS 'Joseph Gordon-Levitt'",
    );
  });

  it("filters by streamingPlatforms", () => {
    expect(buildFilterString({ streamingPlatforms: ["Netflix"] })).toBe(
      "streamingPlatforms CONTAINS 'Netflix'",
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
      "mediaType = 'movie' AND genreIds CONTAINS 878 AND releaseYear >= 2020 AND voteAverage >= 7",
    );
  });

  it("escapes single quotes in string values", () => {
    expect(buildFilterString({ cast: ["Lupita Nyong'o"] })).toBe(
      "cast CONTAINS 'Lupita Nyong\\'o'",
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
      cast: ["Leonardo DiCaprio"],
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
    directors: ["Christopher Nolan"],
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
