import { queryOptions } from "@tanstack/react-query";
import type { getConfiguration } from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";

export const configurationQuery = queryOptions({
  queryKey: [{ query: "configuration", ...tmdbScope }],
  queryFn: async () =>
    apiRequestWrapper<typeof getConfiguration>(
      "/api/tmdb/get-configuration",
      undefined,
    ),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
});
