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

  // TV Details & Media
  { path: "/3/tv/{series_id}", functionName: "getTvShowDetails" },
  { path: "/3/tv/{series_id}/videos", functionName: "getTvShowVideos" },
  {
    path: "/3/tv/{series_id}/recommendations",
    functionName: "getTvShowRecommendations",
  },

  // Search Functions
  {
    path: "/3/search/movie",
    functionName: "searchMovies",
    requiredParams: true,
    needsZodSchema: true, // Required for AI tools
  },
  {
    path: "/3/search/tv",
    functionName: "searchTvShows",
    requiredParams: true,
    needsZodSchema: true, // Required for AI tools
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
];
