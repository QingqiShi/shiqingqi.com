import { Grid } from "@/components/movie-database/grid";
import { MovieCard } from "@/components/movie-database/movie-card";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import type { PageProps } from "@/types";
import { fetchMovieList } from "@/utils/tmdb-api";

export default async function Page(props: PageProps) {
  const params = await props.params;

  const movies = await fetchMovieList({ locale: params.locale });

  return (
    <TranslationProvider translations={{ card: cardTranslations }}>
      {/* TODO: filters */}
      <Grid>
        {movies.results?.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </Grid>
    </TranslationProvider>
  );
}
