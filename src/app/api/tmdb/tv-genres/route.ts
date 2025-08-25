import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchTvShowGenres } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchTvShowGenres);
