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

// When a single film has multiple crew rows for the same person (Director +
// Producer + Writer is common), keep the most query-relevant department.
// Surfacing "Directing" for an actor-director answers the most common
// "what has X directed?" question; "Acting" is implicit in `character` and
// has no value here.
const DEPARTMENT_PRIORITY: ReadonlyArray<string> = [
  "Directing",
  "Writing",
  "Production",
];

function pickHigherPriorityDepartment(
  current: string | undefined,
  next: string | undefined,
): string | undefined {
  if (!current) return next;
  if (!next) return current;
  if (current === next) return current;
  const currentRank = DEPARTMENT_PRIORITY.indexOf(current);
  const nextRank = DEPARTMENT_PRIORITY.indexOf(next);
  // Lower index = higher priority. Departments not in the list rank last.
  const currentScore = currentRank === -1 ? Infinity : currentRank;
  const nextScore = nextRank === -1 ? Infinity : nextRank;
  return nextScore < currentScore ? next : current;
}

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

      // Merge cast + crew by `${mediaType}:${id}` so an actor-director's
      // single film carries both `character` and `department`. The previous
      // first-wins dedup silently dropped the crew row whenever the cast
      // row was processed first — losing every "Directed by" signal for
      // hybrids like Eastwood, Affleck, Gibson, etc.
      const merged = new Map<string, CreditResult>();

      for (const raw of credits.cast ?? []) {
        if (!isRecord(raw)) continue;
        if (typeof raw.id !== "number") continue;
        const mediaType = getMediaType(raw);
        const key = `${String(mediaType)}:${String(raw.id)}`;
        const existing = merged.get(key);
        if (existing) {
          existing.character ??= getString(raw, "character");
          continue;
        }
        merged.set(key, {
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
        const department = getString(raw, "department");
        const existing = merged.get(key);
        if (existing) {
          existing.department = pickHigherPriorityDepartment(
            existing.department,
            department,
          );
          continue;
        }
        merged.set(key, {
          id: raw.id,
          media_type: mediaType,
          title: getTitle(raw),
          poster_path: getString(raw, "poster_path"),
          vote_average: getNumber(raw, "vote_average"),
          release_date: getReleaseDate(raw),
          character: undefined,
          department,
        });
      }

      const results = [...merged.values()];
      results.sort((a, b) => b.vote_average - a.vote_average);

      return results.slice(0, MAX_RESULTS);
    },
  });
}
