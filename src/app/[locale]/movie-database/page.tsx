import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { Filters } from "@/components/movie-database/filters";
import { FiltersSkeleton } from "@/components/movie-database/filters-skeleton";
import { MovieList } from "@/components/movie-database/movie-list";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import * as tmdbQueries from "@/utils/tmdb-queries";

export default async function Page(
  props: PageProps & {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  // Fetch config and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tmdbQueries.configuration);
  void queryClient.prefetchInfiniteQuery(
    tmdbQueries.movieList({
      language: params.locale,
      page: 1,
      with_genres:
        typeof searchParams.genre === "string" ? searchParams.genre : undefined,
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<FiltersSkeleton />}>
        <Filters locale={params.locale} />
      </Suspense>
      <MovieList initialPage={1} />
    </HydrationBoundary>
  );
}
