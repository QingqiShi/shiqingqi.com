import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import { Filters } from "@/components/movie-database/filters";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import { MediaFiltersProvider } from "@/components/movie-database/media-filters-provider";
import { TvShowList } from "@/components/movie-database/tv-show-list";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import type { GenreFilterType, Sort } from "@/utils/media-filters-context";
import { fetchConfiguration, fetchTvShowList } from "@/utils/tmdb-api";
import * as tmdbQueries from "@/utils/tmdb-queries";
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
    queryFn: () => fetchConfiguration(),
  });
  const queryParams = {
    language: params.locale,
    page: 1,
    with_genres: genres?.join(genreFilterType === "any" ? "|" : ","),
    sort_by: sort !== "popularity.desc" ? sort : undefined,
  };
  void queryClient.prefetchInfiniteQuery({
    ...tmdbQueries.tvShowList(queryParams),
    queryFn: async ({ pageParam }) => {
      return fetchTvShowList({ ...queryParams, page: pageParam });
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MediaFiltersProvider
        defaultFilters={{
          genres,
          genreFilterType,
          sort,
        }}
      >
        <Suspense fallback={<FiltersSkeleton />}>
          <Filters
            locale={params.locale}
            mobileButtonLabel={t("filterMobileButtonLabel")}
            mediaType="tv"
          />
        </Suspense>
        <TvShowList initialPage={1} notFoundLabel={t("notFound")} />
      </MediaFiltersProvider>
    </HydrationBoundary>
  );
}
