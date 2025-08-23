import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchSimilarTvShows } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchSimilarTvShows);
