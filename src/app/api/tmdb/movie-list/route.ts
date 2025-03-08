import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchMovieList } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchMovieList);
