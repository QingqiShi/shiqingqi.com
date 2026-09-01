/**
 * API routes to generate, mapping server function names to route paths.
 */

export const apiRoutes = [
  { functionName: "getConfiguration", routePath: "get-configuration" },
  { functionName: "getMovieGenres", routePath: "get-movie-genres" },
  { functionName: "getTvShowGenres", routePath: "get-tv-genres" },
  { functionName: "discoverMovies", routePath: "discover-movies" },
  { functionName: "discoverTvShows", routePath: "discover-tv-shows" },
  {
    functionName: "getMovieRecommendations",
    routePath: "get-movie-recommendations",
  },
  {
    functionName: "getTvShowRecommendations",
    routePath: "get-tv-show-recommendations",
  },
  { functionName: "getMovieDetails", routePath: "get-movie-details" },
  { functionName: "getTvShowDetails", routePath: "get-tv-show-details" },
  { functionName: "getMovieVideos", routePath: "get-movie-videos" },
  { functionName: "getTvShowVideos", routePath: "get-tv-show-videos" },
  { functionName: "getMovieCredits", routePath: "get-movie-credits" },
  { functionName: "getTvShowCredits", routePath: "get-tv-show-credits" },
  { functionName: "getPersonDetails", routePath: "get-person-details" },
  {
    functionName: "getPersonCombinedCredits",
    routePath: "get-person-combined-credits",
  },
];
