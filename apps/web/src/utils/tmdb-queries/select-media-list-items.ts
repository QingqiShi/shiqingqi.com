import type { MediaListItem } from "../media-list-item";
import type { ResponseType } from "../tmdb-get";

type MovieResult = NonNullable<
  ResponseType<"/3/discover/movie", "get">["results"]
>[number];
type TvResult = NonNullable<
  ResponseType<"/3/discover/tv", "get">["results"]
>[number];
type MediaResult = MovieResult | TvResult;

function isMovieListResult(result: MediaResult): result is MovieResult {
  return "title" in result;
}

interface PaginatedMediaData {
  pages: ReadonlyArray<{
    results?: ReadonlyArray<MediaResult>;
  }>;
}

/** Flattens every fetched page into deduplicated rows the grid can render. */
export function selectMediaListItems(
  data: PaginatedMediaData,
  mediaType: "movie" | "tv",
): MediaListItem[] {
  const items = data.pages
    .flatMap<MediaResult>((page) => page.results ?? [])
    .map<MediaListItem>((media) => {
      const shared = {
        id: media.id,
        posterPath: media.poster_path,
        rating: media.vote_average,
        mediaType,
        voteCount: media.vote_count,
        popularity: media.popularity,
        genreIds: media.genre_ids,
        originalLanguage: media.original_language,
        overview: media.overview,
      };
      return isMovieListResult(media)
        ? {
            ...shared,
            title: media.title,
            originalTitle: media.original_title,
            releaseDate: media.release_date,
          }
        : {
            ...shared,
            title: media.name,
            originalTitle: media.original_name,
            releaseDate: media.first_air_date,
          };
    });
  return Array.from(new Map(items.map((media) => [media.id, media])).values());
}
