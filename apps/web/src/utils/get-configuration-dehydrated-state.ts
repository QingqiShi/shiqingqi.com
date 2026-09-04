import { dehydrate } from "@tanstack/react-query";
import { getConfiguration } from "#src/_generated/tmdb-server-functions.ts";
import { getQueryClient } from "#src/utils/get-query-client.ts";
import { noop } from "#src/utils/noop.ts";
import { configurationQuery } from "#src/utils/tmdb-queries/configuration-query.ts";

/**
 * Starts a server-side configuration prefetch and returns the dehydrated
 * state for a HydrationBoundary. A server component that renders
 * PosterImage outside the page-level HydrationBoundary must wrap the
 * subtree with this state, or PosterImage's useSuspenseQuery runs its
 * client-only queryFn during SSR.
 */
export function getConfigurationDehydratedState() {
  const queryClient = getQueryClient();
  queryClient
    .query({
      ...configurationQuery,
      queryFn: async () => getConfiguration(),
    })
    .catch(noop);
  return dehydrate(queryClient);
}
