import { Grid } from "@/components/movie-database/grid";
import { MovieCard } from "@/components/movie-database/movie-card";
import type { PageProps } from "@/types";
import { fetchMovieList } from "@/utils/tmdb-api";

export default async function Page(props: PageProps) {
  const params = await props.params;

  const movies = await fetchMovieList({ locale: params.locale });

  return (
    <>
      {/* TODO: filters */}
      <Grid>
        {movies.results?.map((movie) => (
          <MovieCard key={movie.id} locale={params.locale} movie={movie} />
        ))}
      </Grid>
    </>
  );
}
