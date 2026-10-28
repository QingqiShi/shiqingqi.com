import type { MediaMetadata } from "@tuja/tmdb-types/types";
import { vectorSearchFiltersSchema } from "@tuja/tmdb-types/vector-search-filters-schema";
import type { QueryResult } from "@upstash/vector";
import { describe, expect, it } from "vitest";
import { buildFilterString, mapQueryResult } from "./semantic-search";

describe("buildFilterString", () => {
  it("returns undefined for empty filters", () => {
    expect(buildFilterString({})).toBeUndefined();
  });

  it("filters by multiple genreIds with AND", () => {
    expect(buildFilterString({ genreIds: [35, 18] })).toBe(
      "genreIds CONTAINS 35 AND genreIds CONTAINS 18",
    );
  });

  it("filters by year range", () => {
    expect(
      buildFilterString({ releaseYearMin: 1990, releaseYearMax: 1999 }),
    ).toBe("releaseYear >= 1990 AND releaseYear <= 1999");
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
});

describe("vectorSearchFiltersSchema", () => {
  it("rejects invalid mediaType", () => {
    expect(() =>
      vectorSearchFiltersSchema.parse({ mediaType: "anime" }),
    ).toThrow();
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
});
