import { MovieCard } from "@/components/movie-database/movie-card";
import { MovieList } from "@/components/movie-database/movie-list";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import type { PageProps } from "@/types";
import { fetchMovieList } from "@/utils/tmdb-api";

export default async function Page(props: PageProps) {
  const params = await props.params;

  async function loadMoreAction(page: number) {
    "use server";
    const movies = await fetchMovieList({ language: params.locale, page });
    console.log("inside", movies);
    return (
      movies.results?.map((movie) => (
        <MovieCard key={movie.id} locale={params.locale} movie={movie} />
      )) ?? []
    );
  }

  return (
    <TranslationProvider translations={{ card: cardTranslations }}>
      {/* TODO: filters */}
      <MovieList
        initialList={await loadMoreAction(1)}
        loadMoreAction={loadMoreAction}
      />
    </TranslationProvider>
  );
}
