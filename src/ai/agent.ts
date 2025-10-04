import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseInput } from "openai/resources/responses/responses.mjs";
import { cacheSignal } from "react";
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
    // Only log real errors, not cancellation errors
    if (!cacheSignal()?.aborted) {
      console.error("Failed to fetch reference data:", error);
    }
    throw error;
  }

  return template
    .replaceAll("{currentDate}", currentDate)
    .replaceAll("{locale}", locale)
    .replaceAll("{currentMonth}", currentMonth)
    .replaceAll("{currentYear}", currentYear.toString())
    .replaceAll("{movieGenres}", movieGenres)
    .replaceAll("{tvGenres}", tvGenres)
    .replaceAll("{countries}", countries)
    .replaceAll("{languages}", languages);
}

export async function agent(
  userMessage: string,
  locale: SupportedLocale = "en",
): Promise<AgentResponse> {
  const fullConversation: ResponseInput = [
    {
      role: "developer" as const,
      content: await getSystemInstructions(locale),
    },
    {
      role: "user" as const,
      content: userMessage,
    },
  ];

  // Phase 1: Tool calling loop
  let toolCallingComplete = false;
  const maxIterations = 5; // Prevent infinite loops
  let iteration = 0;

  console.log("user message: ", userMessage);

  while (!toolCallingComplete && iteration < maxIterations) {
    const response = await getOpenAIClient().responses.create({
      model: getOpenAIModel(),
      input: fullConversation,
      tools: availableTools,
      reasoning: { effort: "low", summary: "auto" },
      text: { verbosity: "low" },
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
      const item = outputItem;
      fullConversation.push(item);

      if (item.type === "function_call") {
        console.log("tool call: ", item.name);
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

        // Collect for parallel execution
        toolCalls.push({
          name: item.name,
          arguments: JSON.stringify(toolArgs),
          call_id: item.call_id,
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
            // Only log real errors, not cancellation errors
            if (!cacheSignal()?.aborted) {
              console.error("Tool execution error:", error);
            }
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
    if (hasCompletionCall || !toolCalls.length) {
      toolCallingComplete = true;
    }

    iteration++;
  }

  // Phase 2: Structured output for final processing
  fullConversation.push({
    role: "developer",
    content: "Begin phase 2 and return structured final results",
  });
  const finalResponse = await getOpenAIClient().responses.parse({
    model: getOpenAIModel(),
    input: fullConversation,
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

  finalResponse.output.forEach((output) => fullConversation.push(output));

  // Save conversation for debugging in development only
  if (process.env.NODE_ENV === "development") {
    try {
      const logFile = `/tmp/ai-conversation-${Date.now()}.json`;
      writeFileSync(logFile, JSON.stringify(fullConversation, null, 2));
      console.log(`Debug conversation saved to ${logFile}`);
    } catch (debugError) {
      console.error("Failed to save debug conversation:", debugError);
    }
  }

  return {
    items: parsed.media_list,
  };
}
