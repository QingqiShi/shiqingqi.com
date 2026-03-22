import { describe, it, expect } from "vitest";
import { makeMovieDetail, makeTvDetail } from "./test-fixtures.ts";
import { transformMovie, transformTv } from "./transform.ts";

describe("transformMovie", () => {
  it("produces correct VectorRecord", () => {
    const record = transformMovie(makeMovieDetail());
    expect(record.id).toBe("movie-550");
    expect(record.data).toContain("Fight Club");
    expect(record.metadata).toEqual({
      tmdbId: 550,
      mediaType: "movie",
      title: "Fight Club",
      originalTitle: "Fight Club",
      overview:
        "An insomniac office worker and a soap salesman build a global anarchist movement.",
      genreIds: [18, 53],
      releaseYear: 1999,
      voteAverage: 8.4,
      voteCount: 25000,
      popularity: 60.5,
      posterPath: "/pB8BM7pdSp6B6Ih7QI4S2t0POsFJ.jpg",
      originalLanguage: "en",
      directorIds: [7467],
      directors: ["David Fincher"],
      castIds: [819, 287, 1283],
      cast: ["Edward Norton", "Brad Pitt", "Helena Bonham Carter"],
      streamingPlatforms: ["Netflix", "Hulu"],
    });
  });

  it("handles missing release date", () => {
    const record = transformMovie(makeMovieDetail({ release_date: "" }));
    expect(record.metadata.releaseYear).toBe(0);
  });
});

describe("transformTv", () => {
  it("produces correct VectorRecord", () => {
    const record = transformTv(makeTvDetail());
    expect(record.id).toBe("tv-1396");
    expect(record.data).toContain("Breaking Bad");
    expect(record.metadata.mediaType).toBe("tv");
    expect(record.metadata.title).toBe("Breaking Bad");
    expect(record.metadata.releaseYear).toBe(2008);
  });
});
