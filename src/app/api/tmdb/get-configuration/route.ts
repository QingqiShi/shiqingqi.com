import { getConfiguration } from "@/_generated/tmdb-server-functions";
import { apiRouteWrapper } from "@/utils/api-route-wrapper";

export const GET = apiRouteWrapper(getConfiguration);
