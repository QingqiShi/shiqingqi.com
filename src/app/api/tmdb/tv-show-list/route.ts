import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchTvShowList } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchTvShowList);
