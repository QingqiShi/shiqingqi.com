import { tool } from "ai";
import { z } from "zod";
import {
  getMovieCredits,
  getTvShowCredits,
} from "#src/_generated/tmdb-server-functions.ts";

export const mediaCreditsInputSchema = z.object({
  media_id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
});

const TOOL_DESCRIPTION =
  "Fetch the cast and crew of a movie or TV show. " +
  "Use this when the user asks who stars in, acts in, or directed a specific title. " +
  "After receiving results, use present_person to display the cast visually.";

const MAX_RESULTS = 20;

export function createMediaCreditsTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: mediaCreditsInputSchema,
    execute: async ({ media_id, media_type }) => {
      const idString = media_id.toString();
      const credits =
        media_type === "tv"
          ? await getTvShowCredits({ series_id: idString })
          : await getMovieCredits({ movie_id: idString });

      const cast = (credits.cast ?? []).slice(0, MAX_RESULTS).map((entry) => ({
        id: entry.id,
        name: entry.name,
        profile_path: entry.profile_path,
        known_for_department: entry.known_for_department,
        character: entry.character,
        order: entry.order,
      }));

      return cast;
    },
  });
}
