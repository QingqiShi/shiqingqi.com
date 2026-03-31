import { tool } from "ai";
import { z } from "zod";
import { getPersonCombinedCredits } from "#src/_generated/tmdb-server-functions.ts";
import type { ResponseType } from "#src/utils/tmdb-client.ts";

// The TMDB OpenAPI spec flattens the combined credits union type, omitting
// fields that only appear for TV entries. The API returns these at runtime.
type CombinedCreditEntry = NonNullable<
  ResponseType<"/3/person/{person_id}/combined_credits", "get">["cast"]
>[number] & {
  name?: string;
  first_air_date?: string;
  department?: string;
};

export const personCreditsInputSchema = z.object({
  person_id: z.number().describe("The TMDB person ID from search results."),
});

const TOOL_DESCRIPTION =
  "Fetch a person's filmography (movies and TV shows they have acted in, directed, etc.). " +
  "Use this when the user asks about someone's career, filmography, or specific roles. " +
  "After receiving results, use present_media to display them visually.";

function getTitle(entry: CombinedCreditEntry): string | undefined {
  return entry.title ?? entry.name;
}

function getReleaseDate(entry: CombinedCreditEntry): string | undefined {
  return entry.release_date ?? entry.first_air_date;
}

function getMediaType(entry: CombinedCreditEntry): "movie" | "tv" | undefined {
  if (entry.media_type === "movie" || entry.media_type === "tv") {
    return entry.media_type;
  }
  return undefined;
}

export function createPersonCreditsTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: personCreditsInputSchema,
    execute: async ({ person_id }) => {
      const credits = await getPersonCombinedCredits({
        person_id: person_id.toString(),
      });

      const seen = new Set<string>();
      const results: Array<{
        id: number;
        media_type: "movie" | "tv" | undefined;
        title: string | undefined;
        poster_path: string | undefined;
        vote_average: number;
        release_date: string | undefined;
        character: string | undefined;
        department: string | undefined;
      }> = [];

      for (const entry of (credits.cast ?? []) as CombinedCreditEntry[]) {
        const mediaType = getMediaType(entry);
        const key = `${mediaType}:${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          id: entry.id,
          media_type: mediaType,
          title: getTitle(entry),
          poster_path: entry.poster_path,
          vote_average: entry.vote_average,
          release_date: getReleaseDate(entry),
          character: entry.character,
          department: undefined,
        });
      }

      for (const entry of (credits.crew ?? []) as CombinedCreditEntry[]) {
        const mediaType = getMediaType(entry);
        const key = `${mediaType}:${entry.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          id: entry.id,
          media_type: mediaType,
          title: getTitle(entry),
          poster_path: entry.poster_path,
          vote_average: entry.vote_average,
          release_date: getReleaseDate(entry),
          character: undefined,
          department: entry.department,
        });
      }

      results.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));

      return results;
    },
  });
}
