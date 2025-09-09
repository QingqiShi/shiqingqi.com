import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import "server-only";
import { z } from "zod";
import {
  getConfigurationCountries,
  getConfigurationLanguages,
  getMovieGenres,
  getTvShowGenres,
} from "@/_generated/tmdb-server-functions";
import type { SupportedLocale } from "@/types";
import type { MediaListItem } from "@/utils/types";
import { getOpenAIClient, getOpenAIModel } from "./client";
import { availableTools, executeToolCall } from "./tools";

// MediaListItem schema matching the type structure
const MediaListItemSchema = z.object({
  id: z.number(),
  title: z.string().optional().nullable(),
  posterPath: z.string().optional().nullable(),
  rating: z.number().optional().nullable(),
  mediaType: z.enum(["movie", "tv"]).optional().nullable(),
});

// Agent response schema - array of MediaListItem
const AgentResponseSchema = z.object({
  media_list: z.array(MediaListItemSchema),
});

interface AgentResponse {
  items: MediaListItem[];
}

async function getSystemInstructions(locale: SupportedLocale): Promise<string> {
  const instructionsPath = join(
    process.cwd(),
    "src",
    "ai",
    "system-instructions.md",
  );
  const template = readFileSync(instructionsPath, "utf-8");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.toLocaleString("en-US", { month: "long" });
  const currentDate = now.toISOString().split("T")[0];

  // Fetch reference data from TMDB
  let movieGenres = "";
  let tvGenres = "";
  let countries = "";
  let languages = "";

  try {
    const [
      movieGenreResponse,
      tvGenreResponse,
      countriesResponse,
      languagesResponse,
    ] = await Promise.all([
      getMovieGenres({ language: locale }),
      getTvShowGenres({ language: locale }),
      getConfigurationCountries(),
      getConfigurationLanguages(),
    ]);

    // Format movie genres
    if (movieGenreResponse.genres) {
      movieGenres = movieGenreResponse.genres
        .map((genre) => `${genre.name || "Unknown"} (ID: ${genre.id})`)
        .join(", ");
    }

    // Format TV genres
    if (tvGenreResponse.genres) {
      tvGenres = tvGenreResponse.genres
        .map((genre) => `${genre.name || "Unknown"} (ID: ${genre.id})`)
        .join(", ");
    }

    // Format countries
    if (countriesResponse && Array.isArray(countriesResponse)) {
      const filteredCountries = countriesResponse
        .filter(
          (country): country is { iso_3166_1: string; english_name: string } =>
            Boolean(country.iso_3166_1 && country.english_name),
        )
        .sort((a, b) => a.english_name.localeCompare(b.english_name));
      countries = filteredCountries
        .map((country) => `${country.english_name} (${country.iso_3166_1})`)
        .join(", ");
    }

    // Format languages
    if (languagesResponse && Array.isArray(languagesResponse)) {
      const filteredLanguages = languagesResponse
        .filter((lang): lang is { iso_639_1: string; english_name: string } =>
          Boolean(lang.iso_639_1 && lang.english_name),
        )
        .sort((a, b) => a.english_name.localeCompare(b.english_name));
      languages = filteredLanguages
        .map((language) => `${language.english_name} (${language.iso_639_1})`)
        .join(", ");
    }
  } catch (error) {
    console.error("Failed to fetch reference data:", error);
    // Fallback to hardcoded data if API fails
    movieGenres =
      "Action (ID: 28), Adventure (ID: 12), Animation (ID: 16), Comedy (ID: 35), Crime (ID: 80), Documentary (ID: 99), Drama (ID: 18), Family (ID: 10751), Fantasy (ID: 14), History (ID: 36), Horror (ID: 27), Music (ID: 10402), Mystery (ID: 9648), Romance (ID: 10749), Science Fiction (ID: 878), TV Movie (ID: 10770), Thriller (ID: 53), War (ID: 10752), Western (ID: 37)";
    tvGenres =
      "Action & Adventure (ID: 10759), Animation (ID: 16), Comedy (ID: 35), Crime (ID: 80), Documentary (ID: 99), Drama (ID: 18), Family (ID: 10751), Kids (ID: 10762), Mystery (ID: 9648), News (ID: 10763), Reality (ID: 10764), Sci-Fi & Fantasy (ID: 10765), Soap (ID: 10766), Talk (ID: 10767), War & Politics (ID: 10768), Western (ID: 37)";
    countries =
      "United States (US), United Kingdom (GB), Canada (CA), Australia (AU), Germany (DE), France (FR), Italy (IT), Spain (ES), Japan (JP), South Korea (KR), China (CN), India (IN), Brazil (BR), Mexico (MX), Argentina (AR), Russia (RU), Sweden (SE), Norway (NO), Denmark (DK), Netherlands (NL)";
    languages =
      "English (en), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Japanese (ja), Korean (ko), Chinese (zh), Hindi (hi), Russian (ru), Arabic (ar), Dutch (nl), Swedish (sv), Norwegian (no), Danish (da), Finnish (fi), Polish (pl), Turkish (tr), Greek (el)";
  }

  return template
    .replace("{currentDate}", currentDate)
    .replace("{locale}", locale)
    .replace("{currentMonth}", currentMonth)
    .replace("{currentYear}", currentYear.toString())
    .replace("{movieGenres}", movieGenres)
    .replace("{tvGenres}", tvGenres)
    .replace("{countries}", countries)
    .replace("{languages}", languages);
}

export async function agent(
  userMessage: string,
  locale: SupportedLocale = "en",
): Promise<AgentResponse> {
  const instructions = await getSystemInstructions(locale);
  const initialMessages = [
    {
      role: "developer" as const,
      content: instructions,
    },
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  const fullConversation: ResponseInput = [...initialMessages];

  // Phase 1: Tool calling loop
  let toolCallingComplete = false;
  const maxIterations = 5; // Prevent infinite loops
  let iteration = 0;

  while (!toolCallingComplete && iteration < maxIterations) {
    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      input: fullConversation,
      tools: availableTools,
    });

    if (response.status !== "completed") {
      throw new Error(`Tool calling phase failed: ${response.status}`);
    }

    let hasCompletionCall = false;

    // Collect all tool calls for parallel execution
    const toolCalls: Array<{
      name: string;
      arguments: string;
      call_id: string;
    }> = [];

    for (const outputItem of response.output) {
      const item = outputItem as {
        type: string;
        content?: string;
        name?: string;
        arguments?: string;
        call_id?: string;
      };

      if (item.type === "function_call") {
        // Check if this is the completion call
        if (item.name === "complete_phase_1") {
          hasCompletionCall = true;
        }

        // Auto-inject language parameter based on locale
        const toolArgs = JSON.parse(item.arguments || "{}") as Record<
          string,
          unknown
        >;

        if (!toolArgs.language) {
          toolArgs.language = locale === "zh" ? "zh-CN" : "en-US";
        }

        // Add function call to conversation
        fullConversation.push({
          type: "function_call",
          call_id: item.call_id!,
          name: item.name!,
          arguments: item.arguments ?? "",
        });

        // Collect for parallel execution
        toolCalls.push({
          name: item.name!,
          arguments: JSON.stringify(toolArgs),
          call_id: item.call_id!,
        });
      } else if (item.type === "message" && item.content) {
        // Add AI's response to conversation
        fullConversation.push({
          role: "assistant",
          content: item.content,
        });
      }
    }

    // Execute all tool calls in parallel
    if (toolCalls.length > 0) {
      const results = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            const result = await executeToolCall(toolCall);
            return {
              success: true,
              call_id: toolCall.call_id,
              result: result.result,
            };
          } catch (error) {
            console.error("Tool execution error:", error);
            return {
              success: false,
              call_id: toolCall.call_id,
              error: `Failed to execute ${toolCall.name}`,
            };
          }
        }),
      );

      // Add all tool results to conversation
      for (const result of results) {
        fullConversation.push({
          type: "function_call_output",
          call_id: result.call_id,
          output: JSON.stringify(
            result.success ? result.result : { error: result.error },
          ),
        });
      }
    }

    // Detection: AI is done with Phase 1 if it called complete_phase_1
    if (hasCompletionCall) {
      toolCallingComplete = true;
    }

    iteration++;
  }

  // Phase 2: Structured output for final processing
  const finalResponse = await getOpenAIClient().responses.parse({
    model: getOpenAIModel(),
    input: [
      ...fullConversation,
      {
        role: "developer",
        content:
          "Based on all the TMDB data retrieved, provide a final filtered and ranked list of recommendations that best match the user's original query. Consider relevance, ratings, diversity, and user preferences. IMPORTANT: Extract posterPath (from poster_path field) and mediaType from the TMDB API responses. For movies use mediaType: 'movie', for TV shows use mediaType: 'tv'. Return only the most relevant results.",
      },
    ],
    text: {
      format: zodTextFormat(AgentResponseSchema, "media_list"),
    },
  });

  if (finalResponse.status !== "completed") {
    throw new Error(`Structured output phase failed: ${finalResponse.status}`);
  }

  const parsed = finalResponse.output_parsed;
  if (!parsed) {
    throw new Error("No parsed output available from final processing");
  }

  // Save conversation for debugging in development only
  if (process.env.NODE_ENV === "development") {
    try {
      writeFileSync(
        `/tmp/ai-conversation-${Date.now()}.json`,
        JSON.stringify({ fullConversation, finalResponse, parsed }, null, 2),
      );
    } catch (debugError) {
      console.error("Failed to save debug conversation:", debugError);
    }
  }

  return {
    items: parsed.media_list,
  };
}
