import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import { Filters } from "@/components/movie-database/filters";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import { MediaFiltersProvider } from "@/components/movie-database/media-filters-provider";
import { MediaList } from "@/components/movie-database/media-list";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import type { GenreFilterType, Sort } from "@/utils/media-filters-context";
import * as tmdbQueries from "@/utils/tmdb-queries";
import {
  discoverMovies,
  discoverTvShows,
  getConfiguration,
} from "@/utils/tmdb-server-functions";
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

  // Fetch config and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    ...tmdbQueries.configuration,
    queryFn: () => getConfiguration(),
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
        <Suspense fallback={<FiltersSkeleton />}>
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
