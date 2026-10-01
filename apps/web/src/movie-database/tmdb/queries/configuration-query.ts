import { queryOptions } from "@tanstack/react-query";
import { getConfiguration } from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { TmdbFunctions } from "./types";

export const configurationQuery = (
  tmdb: Pick<TmdbFunctions, "getConfiguration"> = { getConfiguration },
) =>
  queryOptions({
    queryKey: [{ query: "configuration", ...tmdbScope }],
    queryFn: async () => tmdb.getConfiguration(),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
