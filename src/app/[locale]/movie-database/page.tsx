import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { MovieList } from "@/components/movie-database/movie-list";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import type { PageProps } from "@/types";
import { getQueryClient } from "@/utils/get-query-client";
import * as tmdbQueries from "@/utils/tmdb-queries";

export default async function Page(props: PageProps) {
  const params = await props.params;

  // Fetch config and initial page
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tmdbQueries.configuration);
  void queryClient.prefetchInfiniteQuery(
    tmdbQueries.movieList({ language: params.locale, page: 1 })
  );

  return (
    <TranslationProvider
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        {/* TODO: filters */}
        <MovieList initialPage={1} />
      </HydrationBoundary>
    </TranslationProvider>
  );
}
