import { tool } from "ai";
import { z } from "zod";
import { getPersonCombinedCredits } from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import { toolError } from "./tool-error";

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

// Cap aligned with the sibling media-credits tool (20 cast + 20 crew = 40)
// and the consumer cap in person-detail-content.tsx (MAX_CREDITS = 20).
// Trimming after sort preserves the highest-rated entries.
const MAX_RESULTS = 30;

export function createPersonCreditsTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: personCreditsInputSchema,
    execute: async ({ person_id }) => {
      let credits;
      try {
        credits = await getPersonCombinedCredits({
          person_id: person_id.toString(),
          language: locale,
        });
      } catch (error) {
        console.error("person_credits failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB filmography lookup is temporarily unavailable. Tell the user and suggest trying again shortly.",
        );
      }

      const seen = new Set<string>();
      const results: CreditResult[] = [];

      for (const raw of credits.cast ?? []) {
        if (!isRecord(raw)) continue;
        if (typeof raw.id !== "number") continue;
        const mediaType = getMediaType(raw);
        const key = `${String(mediaType)}:${String(raw.id)}`;
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
        const key = `${String(mediaType)}:${String(raw.id)}`;
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

      return results.slice(0, MAX_RESULTS);
    },
  });
}
