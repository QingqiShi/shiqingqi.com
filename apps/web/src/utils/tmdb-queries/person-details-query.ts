import { queryOptions } from "@tanstack/react-query";
import type { getPersonDetails } from "../../_generated/tmdb-server-functions";
import { apiRequestWrapper } from "../api-request-wrapper";
import { tmdbScope } from "./tmdb-scope";
import type { PersonDetailsParams } from "./types";

/** One Person's details, normalised out of TMDB's snake_case record. */
export interface NormalizedPersonDetails {
  name: string;
  profilePath: string | null;
  biography: string | null;
  birthday: string | null;
  deathday: string | null;
  knownForDepartment: string | null;
}

export const personDetailsQuery = (params: PersonDetailsParams) =>
  queryOptions({
    queryKey: [{ query: "personDetail", ...tmdbScope, ...params }],
    queryFn: async (): Promise<NormalizedPersonDetails> => {
      const { id, ...queryParams } = params;
      const data = await apiRequestWrapper<typeof getPersonDetails>(
        "/api/tmdb/get-person-details",
        { ...queryParams, person_id: id },
      );
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
