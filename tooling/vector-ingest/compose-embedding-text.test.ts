import { describe, it, expect } from "vitest";
import {
  composeEmbeddingText,
  extractCast,
  extractDirectors,
  extractKeywordsFromMovie,
  extractKeywordsFromTv,
  extractStreamingPlatforms,
} from "./compose-embedding-text.ts";
import { makeMovieDetail, makeTvDetail } from "./test-fixtures.ts";

describe("composeEmbeddingText", () => {
  it("includes semantic sections for a movie", () => {
    const detail = makeMovieDetail();
    const text = composeEmbeddingText({
      title: detail.title ?? "",
      originalTitle: detail.original_title ?? "",
      overview: detail.overview ?? "",
      genres: (detail.genres ?? []).flatMap((g) => (g.name ? [g.name] : [])),
      keywords: extractKeywordsFromMovie(detail),
    });
    expect(text).toContain("Title: Fight Club");
    expect(text).toContain("Overview:");
    expect(text).toContain("Genres: Drama, Thriller");
    expect(text).toContain("Keywords: support group, dual identity");
    // Factual attributes should NOT be in embedding text
    expect(text).not.toContain("Type:");
    expect(text).not.toContain("Cast:");
    expect(text).not.toContain("Directors:");
    expect(text).not.toContain("Streaming:");
  });

  it("includes semantic sections for a TV show", () => {
    const detail = makeTvDetail();
    const text = composeEmbeddingText({
      title: detail.name ?? "",
      originalTitle: detail.original_name ?? "",
      overview: detail.overview ?? "",
      genres: (detail.genres ?? []).flatMap((g) => (g.name ? [g.name] : [])),
      keywords: extractKeywordsFromTv(detail),
    });
    expect(text).toContain("Title: Breaking Bad");
    expect(text).toContain("Overview:");
    expect(text).toContain("Genres: Drama, Crime");
    expect(text).toContain("Keywords: drug dealer, cancer");
  });

  it("includes original title when different", () => {
    const text = composeEmbeddingText({
      title: "Fight Club",
      originalTitle: "Club de la Lucha",
      overview: "",
      genres: [],
      keywords: [],
    });
    expect(text).toContain("Original Title: Club de la Lucha");
  });

  it("omits original title when same as title", () => {
    const text = composeEmbeddingText({
      title: "Fight Club",
      originalTitle: "Fight Club",
      overview: "",
      genres: [],
      keywords: [],
    });
    expect(text).not.toContain("Original Title:");
  });

  it("omits empty sections", () => {
    const text = composeEmbeddingText({
      title: "Test",
      originalTitle: "Test",
      overview: "",
      genres: [],
      keywords: [],
    });
    expect(text).not.toContain("Overview:");
    expect(text).not.toContain("Genres:");
    expect(text).not.toContain("Keywords:");
  });
});

describe("extractKeywordsFromMovie", () => {
  it("extracts movie keywords from keywords.keywords", () => {
    const keywords = extractKeywordsFromMovie(makeMovieDetail());
    expect(keywords).toEqual(["support group", "dual identity"]);
  });
});

describe("extractKeywordsFromTv", () => {
  it("extracts TV keywords from keywords.results", () => {
    const keywords = extractKeywordsFromTv(makeTvDetail());
    expect(keywords).toEqual(["drug dealer", "cancer"]);
  });
});

describe("extractDirectors", () => {
  it("extracts directors from movie crew", () => {
    const directors = extractDirectors(
      makeMovieDetail().credits.crew ?? [],
      "movie",
    );
    expect(directors).toEqual(["David Fincher"]);
  });

  it("falls back to Executive Producer for TV", () => {
    const directors = extractDirectors(makeTvDetail().credits.crew ?? [], "tv");
    expect(directors).toEqual(["Vince Gilligan"]);
  });

  it("prefers Series Director for TV when available", () => {
    const crew = [
      {
        adult: false,
        gender: 2,
        id: 1,
        name: "Series Dir",
        job: "Series Director",
        department: "Directing",
        popularity: 1,
      },
      {
        adult: false,
        gender: 2,
        id: 2,
        name: "Exec Prod",
        job: "Executive Producer",
        department: "Production",
        popularity: 1,
      },
    ];
    const directors = extractDirectors(crew, "tv");
    expect(directors).toEqual(["Series Dir"]);
  });
});

describe("extractStreamingPlatforms", () => {
  it("extracts US flatrate providers", () => {
    const platforms = extractStreamingPlatforms(
      makeMovieDetail()["watch/providers"].results,
    );
    expect(platforms).toEqual(["Netflix", "Hulu"]);
  });

  it("returns empty for no US providers", () => {
    const platforms = extractStreamingPlatforms({
      GB: {
        flatrate: [
          { provider_id: 1, provider_name: "BBC", display_priority: 0 },
        ],
      },
    });
    expect(platforms).toEqual([]);
  });

  it("returns empty for no flatrate providers", () => {
    const platforms = extractStreamingPlatforms({ US: {} });
    expect(platforms).toEqual([]);
  });

  it("returns empty for undefined providers", () => {
    const platforms = extractStreamingPlatforms(undefined);
    expect(platforms).toEqual([]);
  });
});

describe("extractCast", () => {
  it("extracts top cast members by order", () => {
    const cast = extractCast(makeMovieDetail().credits.cast ?? []);
    expect(cast).toEqual([
      "Edward Norton",
      "Brad Pitt",
      "Helena Bonham Carter",
    ]);
  });
});
