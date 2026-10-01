import { queryOptions } from "@tanstack/react-query";
import { getPersonCombinedCredits } from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { PersonDetailsParams, TmdbFunctions } from "./types";

export const personCombinedCreditsQuery = (
  params: PersonDetailsParams,
  tmdb: Pick<TmdbFunctions, "getPersonCombinedCredits"> = {
    getPersonCombinedCredits,
  },
) =>
  queryOptions({
    queryKey: [{ query: "personCombinedCredits", ...tmdbScope, ...params }],
    queryFn: async () => {
      const { id, ...queryParams } = params;
      return tmdb.getPersonCombinedCredits({ ...queryParams, person_id: id });
    },
  });
