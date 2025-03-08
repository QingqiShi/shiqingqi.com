import { apiRouteWrapper } from "@/utils/api-route-wrapper";
import { fetchConfiguration } from "@/utils/tmdb-api";

export const GET = apiRouteWrapper(fetchConfiguration);
