import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchSimilarMovies } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchSimilarMovies);
