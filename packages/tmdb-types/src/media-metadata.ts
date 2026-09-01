export type MediaMetadata = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  overview: string;
  genreIds: number[];
  releaseYear: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  posterPath: string | null;
  originalLanguage: string;
  directorIds: number[];
  directors: string[];
  castIds: number[];
  cast: string[];
  streamingPlatforms: string[];
};
