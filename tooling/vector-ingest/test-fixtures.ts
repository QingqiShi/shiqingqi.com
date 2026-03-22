import type { TmdbMovieDetail, TmdbTvDetail } from "./tmdb-types.ts";

export function makeMovieDetail(
  overrides: Partial<TmdbMovieDetail> = {},
): TmdbMovieDetail {
  return {
    adult: false,
    budget: 63000000,
    id: 550,
    popularity: 60.5,
    revenue: 100853753,
    runtime: 139,
    video: false,
    vote_average: 8.4,
    vote_count: 25000,
    title: "Fight Club",
    original_title: "Fight Club",
    overview:
      "An insomniac office worker and a soap salesman build a global anarchist movement.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    release_date: "1999-10-15",
    poster_path: "/pB8BM7pdSp6B6Ih7QI4S2t0POsFJ.jpg",
    original_language: "en",
    credits: {
      id: 550,
      cast: [
        {
          adult: false,
          gender: 2,
          id: 819,
          name: "Edward Norton",
          known_for_department: "Acting",
          popularity: 26.99,
          order: 0,
          cast_id: 4,
          character: "The Narrator",
        },
        {
          adult: false,
          gender: 2,
          id: 287,
          name: "Brad Pitt",
          known_for_department: "Acting",
          popularity: 40.5,
          order: 1,
          cast_id: 5,
          character: "Tyler Durden",
        },
        {
          adult: false,
          gender: 1,
          id: 1283,
          name: "Helena Bonham Carter",
          known_for_department: "Acting",
          popularity: 22.1,
          order: 2,
          cast_id: 6,
          character: "Marla Singer",
        },
      ],
      crew: [
        {
          adult: false,
          gender: 2,
          id: 7467,
          name: "David Fincher",
          job: "Director",
          department: "Directing",
          popularity: 10.5,
        },
      ],
    },
    keywords: {
      id: 550,
      keywords: [
        { id: 825, name: "support group" },
        { id: 1541, name: "dual identity" },
      ],
    },
    "watch/providers": {
      id: 550,
      results: {
        US: {
          flatrate: [
            {
              provider_id: 8,
              provider_name: "Netflix",
              display_priority: 0,
            },
            {
              provider_id: 15,
              provider_name: "Hulu",
              display_priority: 1,
            },
          ],
        },
      },
    },
    ...overrides,
  };
}

export function makeTvDetail(
  overrides: Partial<TmdbTvDetail> = {},
): TmdbTvDetail {
  return {
    adult: false,
    id: 1396,
    in_production: false,
    number_of_episodes: 62,
    number_of_seasons: 5,
    popularity: 120.3,
    vote_average: 8.9,
    vote_count: 12000,
    name: "Breaking Bad",
    original_name: "Breaking Bad",
    overview:
      "A chemistry teacher diagnosed with a terminal lung cancer teams up with a former student to manufacture and sell crystal meth.",
    genres: [
      { id: 18, name: "Drama" },
      { id: 80, name: "Crime" },
    ],
    first_air_date: "2008-01-20",
    poster_path: "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    original_language: "en",
    credits: {
      id: 1396,
      cast: [
        {
          adult: false,
          gender: 2,
          id: 17419,
          name: "Bryan Cranston",
          known_for_department: "Acting",
          popularity: 30.6,
          order: 0,
        },
        {
          adult: false,
          gender: 2,
          id: 84497,
          name: "Aaron Paul",
          known_for_department: "Acting",
          popularity: 18.2,
          order: 1,
        },
      ],
      crew: [
        {
          adult: false,
          gender: 2,
          id: 66633,
          name: "Vince Gilligan",
          job: "Executive Producer",
          department: "Production",
          popularity: 5.3,
        },
      ],
    },
    keywords: {
      id: 1396,
      results: [
        { id: 289, name: "drug dealer" },
        { id: 311, name: "cancer" },
      ],
    },
    "watch/providers": {
      id: 1396,
      results: {
        US: {
          flatrate: [
            {
              provider_id: 8,
              provider_name: "Netflix",
              display_priority: 0,
            },
          ],
        },
      },
    },
    ...overrides,
  };
}
