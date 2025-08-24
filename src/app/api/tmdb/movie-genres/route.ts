import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchMovieGenres } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchMovieGenres);