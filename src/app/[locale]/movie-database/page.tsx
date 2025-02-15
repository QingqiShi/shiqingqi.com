import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { Filters } from "@/components/movie-database/filters";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import { MovieFiltersProvider } from "@/components/movie-database/movie-filters-provider";
import { MovieList } from "@/components/movie-database/movie-list";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { getTranslations } from "@/utils/get-translations";
import * as tmdbQueries from "@/utils/tmdb-queries";
import translations from "./translations.json";

export default async function Page(
  props: PageProps & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const { t } = getTranslations(translations, params.locale);

  const genres =
    typeof searchParams.genre === "string"
      ? [searchParams.genre]
      : searchParams.genre;

  // Fetch config and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tmdbQueries.configuration);
  void queryClient.prefetchInfiniteQuery(
    tmdbQueries.movieList({
      language: params.locale,
      page: 1,
      with_genres: genres?.join(","),
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MovieFiltersProvider defaultFilters={{ genres }}>
        <Suspense fallback={<FiltersSkeleton />}>
          <Filters locale={params.locale} />
        </Suspense>
        <MovieList initialPage={1} notFoundLabel={t("notFound")} />
      </MovieFiltersProvider>
    </HydrationBoundary>
  );
}
