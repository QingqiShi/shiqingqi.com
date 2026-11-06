import { describe, expect, it } from "vitest";
import { buildDiscoverParams } from "./create-tmdb-discover-tool";

const TODAY = "2026-11-05";

describe("buildDiscoverParams", () => {
  it("maps movie filters to TMDB discover params", () => {
    const params = buildDiscoverParams(
      {
        media_type: "movie",
        genre_ids: [53, 80],
        exclude_genre_ids: [27],
        year_from: 2010,
        year_to: 2019,
        original_language: "ko",
        sort_by: "rating",
      },
      "en",
      TODAY,
    );

    expect(params).toMatchObject({
      with_genres: "53,80",
      without_genres: "27",
      with_original_language: "ko",
      "primary_release_date.gte": "2010-01-01",
      "primary_release_date.lte": "2019-12-31",
      sort_by: "vote_average.desc",
    });
  });

  it("filters TV by first air date and stops at today", () => {
    const params = buildDiscoverParams(
      { media_type: "tv", year_from: 2025, year_to: 2030 },
      "en",
      TODAY,
    );

    expect(params["first_air_date.gte"]).toBe("2025-01-01");
    expect(params["first_air_date.lte"]).toBe(TODAY);
    expect(params["primary_release_date.lte"]).toBeUndefined();
  });

  it("raises the vote-count floor when the rating decides the results", () => {
    const byPopularity = buildDiscoverParams(
      { media_type: "movie" },
      "en",
      TODAY,
    );
    const byRating = buildDiscoverParams(
      { media_type: "movie", sort_by: "rating" },
      "en",
      TODAY,
    );
    const withMinRating = buildDiscoverParams(
      { media_type: "movie", min_rating: 8 },
      "en",
      TODAY,
    );

    expect(byRating["vote_count.gte"]).toBeGreaterThan(
      byPopularity["vote_count.gte"] ?? 0,
    );
    expect(withMinRating["vote_count.gte"]).toBe(byRating["vote_count.gte"]);
    expect(withMinRating["vote_average.gte"]).toBe(8);
  });
});
