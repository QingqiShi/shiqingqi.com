import { generateText, tool } from "ai";
import { z } from "zod";
import {
  getMovieReviews,
  getTvShowReviews,
} from "#src/_generated/tmdb-server-functions.ts";
import type { SupportedLocale } from "#src/types.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import { getAnthropicModel } from "../client";
import { toolError } from "./tool-error";

export const reviewSummaryInputSchema = z.object({
  id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
  title: z
    .string()
    .describe("The title of the movie or TV show, for display purposes."),
  spiciness: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .describe(
      "Tone level for the summary. " +
        "1 = neutral and factual, 3 = balanced with personality, " +
        "5 = bold, opinionated, and entertaining. Defaults to 3.",
    ),
});

const TOOL_DESCRIPTION =
  "Fetch user reviews for a movie or TV show and generate an AI summary " +
  "with adjustable tone. Use when users ask about reviews, critical reception, " +
  "or what people think of a title. The spiciness parameter controls the tone " +
  "(1 = neutral, 5 = bold/opinionated).";

const MAX_REVIEWS = 20;
const MAX_REVIEW_LENGTH = 500;

interface ReviewEntry {
  author: string;
  content: string;
  rating: number | null;
}

function extractReviews(results: unknown): ReviewEntry[] {
  if (!Array.isArray(results)) return [];
  const reviews: ReviewEntry[] = [];
  for (const raw of results) {
    if (!isRecord(raw)) continue;
    const content = typeof raw.content === "string" ? raw.content : "";
    if (content.length === 0) continue;

    let rating: number | null = null;
    if (isRecord(raw.author_details)) {
      const r = raw.author_details.rating;
      if (typeof r === "number" && r > 0) {
        rating = r;
      }
    }

    reviews.push({
      author: typeof raw.author === "string" ? raw.author : "Anonymous",
      content:
        content.length > MAX_REVIEW_LENGTH
          ? content.slice(0, MAX_REVIEW_LENGTH) + "…"
          : content,
      rating,
    });

    if (reviews.length >= MAX_REVIEWS) break;
  }
  return reviews;
}

function computeAverageRating(reviews: ReadonlyArray<ReviewEntry>) {
  const rated = reviews.filter((r) => r.rating !== null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, r) => acc + (r.rating ?? 0), 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

function getSpicinessInstruction(spiciness: number): string {
  if (spiciness <= 1) {
    return "Write a balanced, neutral summary that focuses on factual consensus. Be objective and measured like a professional film critic.";
  }
  if (spiciness <= 2) {
    return "Write a mostly neutral summary with occasional personality. Stay close to the facts but allow some dry wit.";
  }
  if (spiciness <= 3) {
    return "Write an engaging summary that captures the range of opinions with personality. Be conversational and let your voice show through.";
  }
  if (spiciness <= 4) {
    return "Write a lively, opinionated summary with strong takes. Be snarky and entertaining — playfully roast the film's weaknesses while acknowledging what works.";
  }
  return (
    "Write in the style of an Honest Trailers narrator: sarcastically affectionate, hyperbolic, mock-dramatic. " +
    "Roast the movie lovingly. Use dramatic pauses (dashes, ellipses), rhetorical questions, and over-the-top descriptions. " +
    "Acknowledge what fans love while mercilessly pointing out the ridiculous parts."
  );
}

function buildSummarizationPrompt(
  title: string,
  reviews: ReadonlyArray<ReviewEntry>,
  spiciness: number,
  locale: SupportedLocale,
): string {
  const reviewBlock = reviews
    .map((r) => {
      const ratingStr = r.rating !== null ? ` [${String(r.rating)}/10]` : "";
      return `- ${r.author}${ratingStr}: ${r.content}`;
    })
    .join("\n");

  const languageInstruction =
    locale === "zh" ? "Respond entirely in Chinese." : "Respond in English.";

  return [
    `Summarize user reviews for "${title}".`,
    "",
    getSpicinessInstruction(spiciness),
    languageInstruction,
    "",
    "Keep the summary concise (2-4 sentences). Do not use markdown formatting.",
    "Do not mention specific reviewer names. Focus on the overall sentiment and key themes.",
    "",
    "Reviews:",
    reviewBlock,
  ].join("\n");
}

export function createReviewSummaryTool(locale: SupportedLocale) {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: reviewSummaryInputSchema,
    execute: async ({ id, media_type, title, spiciness }, { abortSignal }) => {
      const idString = id.toString();
      let response;
      try {
        response =
          media_type === "tv"
            ? await getTvShowReviews({ series_id: idString })
            : await getMovieReviews({ movie_id: idString });
      } catch (error) {
        console.error("review_summary TMDB fetch failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB reviews are temporarily unavailable for this title. Tell the user and suggest trying again shortly.",
        );
      }

      const reviews = extractReviews(response.results);

      if (reviews.length === 0) {
        const noReviewMessage =
          locale === "zh"
            ? `目前还没有关于"${title}"的用户评论。`
            : `No user reviews are available for "${title}" yet.`;
        return {
          id,
          mediaType: media_type,
          title,
          spiciness,
          summary: noReviewMessage,
          reviewCount: 0,
          averageRating: null,
        };
      }

      const averageRating = computeAverageRating(reviews);
      const prompt = buildSummarizationPrompt(
        title,
        reviews,
        spiciness,
        locale,
      );

      let summaryText;
      try {
        const generation = await generateText({
          model: getAnthropicModel(),
          prompt,
          abortSignal,
        });
        summaryText = generation.text;
      } catch (error) {
        console.error("review_summary generation failed", error);
        return toolError(
          "summary_generation_failed",
          "Review summary generation is temporarily unavailable. Tell the user the reviews were fetched but the summary could not be generated — offer to try again.",
        );
      }

      return {
        id,
        mediaType: media_type,
        title,
        spiciness,
        summary: summaryText,
        reviewCount: reviews.length,
        averageRating,
      };
    },
  });
}
