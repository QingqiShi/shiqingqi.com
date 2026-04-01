/**
 * Configuration for generating TMDB server functions and API routes
 * Only includes endpoints actually used in the codebase
 */

export const endpoints = [
  // Configuration
  { path: "/3/configuration", functionName: "getConfiguration" },

  // Genres
  { path: "/3/genre/movie/list", functionName: "getMovieGenres" },
  { path: "/3/genre/tv/list", functionName: "getTvShowGenres" },

  // Trending
  {
    path: "/3/trending/movie/{time_window}",
    functionName: "getTrendingMovies",
  },
  {
    path: "/3/trending/tv/{time_window}",
    functionName: "getTrendingTvShows",
  },

  // Movie Discovery & Lists
  {
    path: "/3/discover/movie",
    functionName: "discoverMovies",
    defaults: { "vote_count.gte": 300, "vote_average.gte": 3 },
    needsZodSchema: true, // Required for AI tools
  },

  // TV Discovery & Lists
  {
    path: "/3/discover/tv",
    functionName: "discoverTvShows",
    defaults: { "vote_count.gte": 300, "vote_average.gte": 3 },
    needsZodSchema: true, // Required for AI tools
  },

  // Movie Details & Media
  { path: "/3/movie/{movie_id}", functionName: "getMovieDetails" },
  { path: "/3/movie/{movie_id}/videos", functionName: "getMovieVideos" },
  {
    path: "/3/movie/{movie_id}/recommendations",
    functionName: "getMovieRecommendations",
  },

  // Watch Providers
  {
    path: "/3/movie/{movie_id}/watch/providers",
    functionName: "getMovieWatchProviders",
  },
  {
    path: "/3/tv/{series_id}/watch/providers",
    functionName: "getTvShowWatchProviders",
  },

  // TV Details & Media
  { path: "/3/tv/{series_id}", functionName: "getTvShowDetails" },
  { path: "/3/tv/{series_id}/videos", functionName: "getTvShowVideos" },
  {
    path: "/3/tv/{series_id}/recommendations",
    functionName: "getTvShowRecommendations",
  },

  // Movie & TV Credits (cast/crew)
  {
    path: "/3/movie/{movie_id}/credits",
    functionName: "getMovieCredits",
  },
  { path: "/3/tv/{series_id}/credits", functionName: "getTvShowCredits" },

  // Person Details
  { path: "/3/person/{person_id}", functionName: "getPersonDetails" },
  {
    path: "/3/person/{person_id}/combined_credits",
    functionName: "getPersonCombinedCredits",
  },

  // Search Functions
  {
    path: "/3/search/multi",
    functionName: "searchMulti",
    requiredParams: true,
  },
];

// API routes to generate (maps function names to route paths)
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
