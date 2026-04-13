import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { mediaDetail, mediaVideos, personDetail } from "./tmdb-queries";

function movieDetailsResponse(
  overrides: Partial<{
    title: string;
    original_title: string;
    poster_path: string;
    backdrop_path: string;
    release_date: string;
    runtime: number;
    genres: { id: number; name: string }[];
    overview: string;
    tagline: string;
    vote_average: number;
    vote_count: number;
  }> = {},
) {
  return {
    adult: false,
    id: 550,
    budget: 63000000,
    revenue: 100853753,
    popularity: 61,
    video: false,
    vote_average: 8.4,
    vote_count: 26280,
    title: "Fight Club",
    original_title: "Fight Club",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    release_date: "1999-10-15",
    runtime: 139,
    genres: [{ id: 18, name: "Drama" }],
    overview: "A ticking-time-bomb insomniac...",
    tagline: "Mischief. Mayhem. Soap.",
    ...overrides,
  };
}

function tvDetailsResponse(
  overrides: Partial<{
    name: string;
    original_name: string;
    poster_path: string;
    backdrop_path: string;
    first_air_date: string;
    number_of_seasons: number;
    number_of_episodes: number;
    genres: { id: number; name: string }[];
    overview: string;
    tagline: string;
    vote_average: number;
    vote_count: number;
    in_production: boolean;
  }> = {},
) {
  return {
    adult: false,
    id: 1399,
    popularity: 346,
    vote_average: 8.4,
    vote_count: 11500,
    name: "Game of Thrones",
    original_name: "Game of Thrones",
    poster_path: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    backdrop_path: "/6LWy0jvMpmjoS9fojNgHIKoWL05.jpg",
    first_air_date: "2011-04-17",
    number_of_seasons: 8,
    number_of_episodes: 73,
    genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }],
    overview: "Seven noble families fight...",
    tagline: "Winter Is Coming",
    in_production: false,
    ...overrides,
  };
}

function videosResponse(
  results: { key: string; type: string; official: boolean }[] = [],
) {
  return { id: 1, results };
}

describe("mediaDetail", () => {
  describe("movie", () => {
    it("normalizes movie details", async () => {
      server.use(
        http.get("*/api/tmdb/get-movie-details", () =>
          HttpResponse.json(movieDetailsResponse()),
        ),
      );

      const options = mediaDetail({ type: "movie", id: "550" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result).toEqual({
        title: "Fight Club",
        posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        backdropPath: "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
        releaseDate: "1999-10-15",
        runtime: 139,
        numberOfSeasons: 0,
        genres: ["Drama"],
        overview: "A ticking-time-bomb insomniac...",
        tagline: "Mischief. Mayhem. Soap.",
        voteAverage: 8.4,
        voteCount: 26280,
      });
    });

    it("falls back to original_title when title is missing", async () => {
      server.use(
        http.get("*/api/tmdb/get-movie-details", () =>
          HttpResponse.json(
            movieDetailsResponse({ title: undefined, original_title: "FC" }),
          ),
        ),
      );

      const options = mediaDetail({ type: "movie", id: "550" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.title).toBe("FC");
    });

    it("returns raw runtime for zero value", async () => {
      server.use(
        http.get("*/api/tmdb/get-movie-details", () =>
          HttpResponse.json(movieDetailsResponse({ runtime: 0 })),
        ),
      );

      const options = mediaDetail({ type: "movie", id: "550" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.runtime).toBe(0);
    });

    it("returns genres as array", async () => {
      server.use(
        http.get("*/api/tmdb/get-movie-details", () =>
          HttpResponse.json(
            movieDetailsResponse({
              genres: [
                { id: 18, name: "Drama" },
                { id: 53, name: "Thriller" },
              ],
            }),
          ),
        ),
      );

      const options = mediaDetail({ type: "movie", id: "550" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.genres).toEqual(["Drama", "Thriller"]);
    });

    it("passes movie_id and language as query params", async () => {
      let requestUrl = "";
      server.use(
        http.get("*/api/tmdb/get-movie-details", ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json(movieDetailsResponse());
        }),
      );

      const options = mediaDetail({
        type: "movie",
        id: "550",
        language: "zh",
      });
      if (!options.queryFn) throw new Error("expected queryFn");
      await options.queryFn({} as never);

      const url = new URL(requestUrl);
      expect(url.searchParams.get("movie_id")).toBe("550");
      expect(url.searchParams.get("language")).toBe("zh");
    });
  });

  describe("tv", () => {
    it("normalizes TV show details", async () => {
      server.use(
        http.get("*/api/tmdb/get-tv-show-details", () =>
          HttpResponse.json(tvDetailsResponse()),
        ),
      );

      const options = mediaDetail({ type: "tv", id: "1399" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result).toEqual({
        title: "Game of Thrones",
        posterPath: "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
        backdropPath: "/6LWy0jvMpmjoS9fojNgHIKoWL05.jpg",
        releaseDate: "2011-04-17",
        runtime: 0,
        numberOfSeasons: 8,
        genres: ["Sci-Fi & Fantasy"],
        overview: "Seven noble families fight...",
        tagline: "Winter Is Coming",
        voteAverage: 8.4,
        voteCount: 11500,
      });
    });

    it("falls back to original_name when name is missing", async () => {
      server.use(
        http.get("*/api/tmdb/get-tv-show-details", () =>
          HttpResponse.json(
            tvDetailsResponse({ name: undefined, original_name: "GoT" }),
          ),
        ),
      );

      const options = mediaDetail({ type: "tv", id: "1399" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.title).toBe("GoT");
    });

    it("returns raw numberOfSeasons", async () => {
      server.use(
        http.get("*/api/tmdb/get-tv-show-details", () =>
          HttpResponse.json(tvDetailsResponse({ number_of_seasons: 0 })),
        ),
      );

      const options = mediaDetail({ type: "tv", id: "1399" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.numberOfSeasons).toBe(0);
    });

    it("returns genres as array", async () => {
      server.use(
        http.get("*/api/tmdb/get-tv-show-details", () =>
          HttpResponse.json(
            tvDetailsResponse({
              genres: [
                { id: 10765, name: "科幻" },
                { id: 18, name: "剧情" },
              ],
            }),
          ),
        ),
      );

      const options = mediaDetail({ type: "tv", id: "1399" });
      if (!options.queryFn) throw new Error("expected queryFn");
      const result = await options.queryFn({} as never);

      expect(result.genres).toEqual(["科幻", "剧情"]);
    });

    it("passes series_id and language as query params", async () => {
      let requestUrl = "";
      server.use(
        http.get("*/api/tmdb/get-tv-show-details", ({ request }) => {
          requestUrl = request.url;
          return HttpResponse.json(tvDetailsResponse());
        }),
      );

      const options = mediaDetail({ type: "tv", id: "1399", language: "en" });
      if (!options.queryFn) throw new Error("expected queryFn");
      await options.queryFn({} as never);

      const url = new URL(requestUrl);
      expect(url.searchParams.get("series_id")).toBe("1399");
      expect(url.searchParams.get("language")).toBe("en");
    });
  });
});

describe("mediaVideos", () => {
  it("fetches movie videos with movie_id", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-movie-videos", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(
          videosResponse([{ key: "abc123", type: "Trailer", official: true }]),
        );
      }),
    );

    const options = mediaVideos({
      type: "movie",
      id: "550",
      language: "en",
    });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("movie_id")).toBe("550");
    expect(result.results).toHaveLength(1);
    expect(result.results?.[0]?.key).toBe("abc123");
  });

  it("fetches TV videos with series_id", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-tv-show-videos", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(videosResponse([]));
      }),
    );

    const options = mediaVideos({ type: "tv", id: "1399", language: "en" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("series_id")).toBe("1399");
    expect(result.results).toHaveLength(0);
  });
});

function personDetailsResponse(
  overrides: Partial<{
    name: string;
    profile_path: string;
    biography: string;
    birthday: string;
    deathday: unknown;
    known_for_department: string;
  }> = {},
) {
  return {
    adult: false,
    id: 31,
    name: "Tom Hanks",
    profile_path: "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
    biography: "Thomas Jeffrey Hanks is an American actor and filmmaker.",
    birthday: "1956-07-09",
    deathday: null,
    gender: 2,
    homepage: null,
    imdb_id: "nm0000158",
    known_for_department: "Acting",
    place_of_birth: "Concord, California, USA",
    popularity: 82.989,
    also_known_as: [],
    ...overrides,
  };
}

describe("personDetail", () => {
  it("normalizes person details", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse()),
      ),
    );

    const options = personDetail({ id: "31" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    expect(result).toEqual({
      name: "Tom Hanks",
      profilePath: "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
      biography: "Thomas Jeffrey Hanks is an American actor and filmmaker.",
      birthday: "1956-07-09",
      deathday: null,
      knownForDepartment: "Acting",
    });
  });

  it("returns deathday when it is a string", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ deathday: "2014-08-11" })),
      ),
    );

    const options = personDetail({ id: "31" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    expect(result.deathday).toBe("2014-08-11");
  });

  it("returns null deathday for non-string values", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ deathday: 0 })),
      ),
    );

    const options = personDetail({ id: "31" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    expect(result.deathday).toBeNull();
  });

  it("falls back to empty string when name is missing", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ name: undefined })),
      ),
    );

    const options = personDetail({ id: "31" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    expect(result.name).toBe("");
  });

  it("returns null for missing optional fields", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(
          personDetailsResponse({
            profile_path: undefined,
            biography: undefined,
            birthday: undefined,
            known_for_department: undefined,
          }),
        ),
      ),
    );

    const options = personDetail({ id: "31" });
    if (!options.queryFn) throw new Error("expected queryFn");
    const result = await options.queryFn({} as never);

    expect(result.profilePath).toBeNull();
    expect(result.biography).toBeNull();
    expect(result.birthday).toBeNull();
    expect(result.knownForDepartment).toBeNull();
  });

  it("passes person_id and language as query params", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-person-details", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(personDetailsResponse());
      }),
    );

    const options = personDetail({ id: "31", language: "zh" });
    if (!options.queryFn) throw new Error("expected queryFn");
    await options.queryFn({} as never);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("person_id")).toBe("31");
    expect(url.searchParams.get("language")).toBe("zh");
  });
});
