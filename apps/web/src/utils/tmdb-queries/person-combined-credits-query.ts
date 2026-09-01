import { queryOptions } from "@tanstack/react-query";
import type { getPersonCombinedCredits } from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";
import type { PersonDetailsParams } from "./types";

export const personCombinedCreditsQuery = (params: PersonDetailsParams) =>
  queryOptions({
    queryKey: [{ query: "personCombinedCredits", ...tmdbScope, ...params }],
    queryFn: async () => {
      const { id, ...queryParams } = params;
      return apiRequestWrapper<typeof getPersonCombinedCredits>(
        "/api/tmdb/get-person-combined-credits",
        { ...queryParams, person_id: id },
      );
    },
  });
