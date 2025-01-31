import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Filters } from "@/components/movie-database/filters";
import filtersTranslations from "@/components/movie-database/filters.translations.json";
import { MovieList } from "@/components/movie-database/movie-list";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import { fetchMovieGenres } from "@/utils/tmdb-api";
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

  const { genres } = await fetchMovieGenres({ language: params.locale });

  return (
    <TranslationProvider
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
        filters: filtersTranslations,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Filters genres={genres} />
        <MovieList initialPage={1} />
      </HydrationBoundary>
    </TranslationProvider>
  );
}
