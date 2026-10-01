import { dehydrate } from "@tanstack/react-query";
import * as tmdbServerFunctions from "#src/_generated/tmdb-server-functions.ts";
import { noop } from "#src/movie-database/noop.ts";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { getQueryClient } from "./get-query-client.ts";

/**
 * Starts a server-side configuration prefetch and returns the dehydrated
 * state for a HydrationBoundary. A server component that renders
 * PosterImage outside the page-level HydrationBoundary must wrap the
 * subtree with this state, or PosterImage's useSuspenseQuery runs its
 * client-only queryFn during SSR.
 */
export function getConfigurationDehydratedState() {
  const queryClient = getQueryClient();
  queryClient.query(configurationQuery(tmdbServerFunctions)).catch(noop);
  return dehydrate(queryClient);
}
