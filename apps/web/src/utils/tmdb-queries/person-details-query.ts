import { queryOptions } from "@tanstack/react-query";
import { getPersonDetails } from "#src/_generated/tmdb-client-functions.ts";
import { tmdbScope } from "./tmdb-scope";
import type { PersonDetailsParams, TmdbFunctions } from "./types";

/** One Person's details, normalised out of TMDB's snake_case record. */
export interface NormalizedPersonDetails {
  name: string;
  profilePath: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  knownForDepartment: string | null;
}

export const personDetailsQuery = (
  params: PersonDetailsParams,
  tmdb: Pick<TmdbFunctions, "getPersonDetails"> = { getPersonDetails },
) =>
  queryOptions({
    queryKey: [{ query: "personDetail", ...tmdbScope, ...params }],
    queryFn: async (): Promise<NormalizedPersonDetails> => {
      const { id, ...queryParams } = params;
      const data = await tmdb.getPersonDetails({
        ...queryParams,
        person_id: id,
      });
      return {
        name: data.name ?? "",
        profilePath: data.profile_path ?? null,
        biography: data.biography ?? null,
        birthday: data.birthday ?? null,
        deathday: typeof data.deathday === "string" ? data.deathday : null,
        knownForDepartment: data.known_for_department ?? null,
      };
    },
  });
