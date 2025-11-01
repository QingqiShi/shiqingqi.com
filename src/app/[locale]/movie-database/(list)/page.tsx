import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  discoverMovies,
  discoverTvShows,
  getConfiguration,
  getMovieGenres,
  getTvShowGenres,
} from "#src/_generated/tmdb-server-functions.ts";
import { FiltersSkeleton } from "#src/components/movie-database/filters-skeleton.tsx";
import { Filters } from "#src/components/movie-database/filters.tsx";
import { MediaFiltersProvider } from "#src/components/movie-database/media-filters-provider.tsx";
import { MediaList } from "#src/components/movie-database/media-list.tsx";
import type { PageProps } from "#src/types.ts";
import { getQueryClient } from "#src/utils/get-query-client.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import type {
  GenreFilterType,
  Sort,
} from "#src/utils/media-filters-context.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import translations from "../translations.json";

export default async function Page(
  props: PageProps & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  },
) {
  await connection();
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { t } = getTranslations(translations, params.locale);

  const type = (
    Array.isArray(searchParams.type) ? searchParams.type[0] : searchParams.type
  ) as "movie" | "tv" | undefined;
  const mediaType = type === "tv" ? "tv" : "movie";

  const genres =
    typeof searchParams.genre === "string"
      ? [searchParams.genre]
      : searchParams.genre;
  const genreFilterType = (
    Array.isArray(searchParams.genreFilterType)
      ? searchParams.genreFilterType[0]
      : searchParams.genreFilterType
  ) as GenreFilterType | undefined;
  const sort = (
    Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort
  ) as Sort | undefined;

  // Fetch config, genres, and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    ...tmdbQueries.configuration,
    queryFn: () => getConfiguration(),
  });
  void queryClient.prefetchQuery({
    ...tmdbQueries.genres({ type: mediaType, language: params.locale }),
    queryFn: () =>
      mediaType === "tv"
        ? getTvShowGenres({ language: params.locale })
        : getMovieGenres({ language: params.locale }),
  });
  const queryParams = {
    language: params.locale,
    page: 1,
    with_genres: genres?.join(genreFilterType === "any" ? "|" : ","),
    sort_by: sort !== "popularity.desc" ? sort : undefined,
  };

  if (mediaType === "tv") {
    void queryClient.prefetchInfiniteQuery({
      ...tmdbQueries.mediaList({ type: "tv", ...queryParams }),
      queryFn: async ({ pageParam }) => {
        return discoverTvShows({
          "vote_count.gte": 300,
          "vote_average.gte": 3,
          ...queryParams,
          page: pageParam,
        });
      },
    });
  } else {
    void queryClient.prefetchInfiniteQuery({
      ...tmdbQueries.mediaList({ type: "movie", ...queryParams }),
      queryFn: async ({ pageParam }) => {
        return discoverMovies({
          "vote_count.gte": 300,
          "vote_average.gte": 3,
          ...queryParams,
          page: pageParam,
        });
      },
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MediaFiltersProvider
        defaultFilters={{
          genres,
          genreFilterType,
          sort,
          mediaType,
        }}
      >
        <Suspense fallback={<FiltersSkeleton locale={params.locale} />}>
          <Filters
            locale={params.locale}
            mobileButtonLabel={t("filterMobileButtonLabel")}
          />
        </Suspense>
        <MediaList initialPage={1} notFoundLabel={t("notFound")} />
      </MediaFiltersProvider>
    </HydrationBoundary>
  );
}
