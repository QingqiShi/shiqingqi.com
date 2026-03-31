import { tool } from "ai";
import { z } from "zod";
import { getPersonCombinedCredits } from "#src/_generated/tmdb-server-functions.ts";

export const personCreditsInputSchema = z.object({
  person_id: z.number().describe("The TMDB person ID from search results."),
});

const TOOL_DESCRIPTION =
  "Fetch a person's filmography (movies and TV shows they have acted in, directed, etc.). " +
  "Use this when the user asks about someone's career, filmography, or specific roles. " +
  "After receiving results, use present_media to display them visually.";

// The TMDB OpenAPI spec flattens the combined credits union type, omitting
// fields that only appear for TV entries. The API returns these at runtime.
// Use runtime field access (via Record) instead of type assertions.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const val = obj[key];
  return typeof val === "string" ? val : undefined;
}

function getNumber(obj: Record<string, unknown>, key: string): number {
  const val = obj[key];
  return typeof val === "number" ? val : 0;
}

function getTitle(entry: Record<string, unknown>): string | undefined {
  return getString(entry, "title") ?? getString(entry, "name");
}

function getReleaseDate(entry: Record<string, unknown>): string | undefined {
  return getString(entry, "release_date") ?? getString(entry, "first_air_date");
}

function getMediaType(
  entry: Record<string, unknown>,
): "movie" | "tv" | undefined {
  const mt = entry.media_type;
  if (mt === "movie" || mt === "tv") return mt;
  return undefined;
}

interface CreditResult {
  id: number;
  media_type: "movie" | "tv" | undefined;
  title: string | undefined;
  poster_path: string | undefined;
  vote_average: number;
  release_date: string | undefined;
  character: string | undefined;
  department: string | undefined;
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
      const results: CreditResult[] = [];

      for (const raw of credits.cast ?? []) {
        if (!isRecord(raw)) continue;
        if (typeof raw.id !== "number") continue;
        const mediaType = getMediaType(raw);
        const key = `${mediaType}:${raw.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          id: raw.id,
          media_type: mediaType,
          title: getTitle(raw),
          poster_path: getString(raw, "poster_path"),
          vote_average: getNumber(raw, "vote_average"),
          release_date: getReleaseDate(raw),
          character: getString(raw, "character"),
          department: undefined,
        });
      }

      for (const raw of credits.crew ?? []) {
        if (!isRecord(raw)) continue;
        if (typeof raw.id !== "number") continue;
        const mediaType = getMediaType(raw);
        const key = `${mediaType}:${raw.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({
          id: raw.id,
          media_type: mediaType,
          title: getTitle(raw),
          poster_path: getString(raw, "poster_path"),
          vote_average: getNumber(raw, "vote_average"),
          release_date: getReleaseDate(raw),
          character: undefined,
          department: getString(raw, "department"),
        });
      }

      results.sort((a, b) => b.vote_average - a.vote_average);

      return results;
    },
  });
}
