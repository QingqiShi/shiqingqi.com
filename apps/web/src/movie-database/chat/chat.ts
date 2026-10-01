import type { LanguageModel } from "ai";
import { convertToModelMessages, isStepCount, streamText } from "ai";
import "server-only";
import { getAnthropicModel } from "#src/anthropic/get-anthropic-model.ts";
import { getAnthropicProvider } from "#src/anthropic/get-anthropic-provider.ts";
import { classifyMoodTool } from "#src/movie-database/chat/tools/classify-mood-tool.ts";
import { createMediaCreditsTool } from "#src/movie-database/chat/tools/create-media-credits-tool.ts";
import { createPersonCreditsTool } from "#src/movie-database/chat/tools/create-person-credits-tool.ts";
import { createReviewSummaryTool } from "#src/movie-database/chat/tools/create-review-summary-tool.ts";
import { createSemanticSearchTool } from "#src/movie-database/chat/tools/create-semantic-search-tool.ts";
import { createTmdbSearchTool } from "#src/movie-database/chat/tools/create-tmdb-search-tool.ts";
import { createWatchProvidersTool } from "#src/movie-database/chat/tools/create-watch-providers-tool.ts";
import { presentMediaTool } from "#src/movie-database/chat/tools/present-media-tool.ts";
import { presentPersonTool } from "#src/movie-database/chat/tools/present-person-tool.ts";
import { presentProviderRegionsTool } from "#src/movie-database/chat/tools/present-provider-regions-tool.ts";
import { presentWatchProvidersTool } from "#src/movie-database/chat/tools/present-watch-providers-tool.ts";
import { savePreferenceTool } from "#src/movie-database/chat/tools/save-preference-tool.ts";
import { addCacheControlToMessages } from "./add-cache-control-to-messages";
import { contextManagementProviderOptions } from "./context-management-provider-options";
import { getChatSystemInstructions } from "./get-chat-system-instructions";
import type { ChatInput } from "./types";

interface ChatOptions extends ChatInput {
  model?: LanguageModel;
}

export async function chat({
  messages,
  locale,
  countryCode,
  model,
}: ChatOptions) {
  const instructions = getChatSystemInstructions(locale, countryCode);
  const modelMessages = await convertToModelMessages(messages);
  const anthropic = getAnthropicProvider();

  return streamText({
    model: model ?? getAnthropicModel(),
    instructions,
    messages: modelMessages,
    tools: {
      classify_mood: classifyMoodTool,
      semantic_search: createSemanticSearchTool(locale),
      tmdb_search: createTmdbSearchTool(locale),
      present_media: presentMediaTool,
      watch_providers: createWatchProvidersTool(),
      present_watch_providers: presentWatchProvidersTool,
      present_provider_regions: presentProviderRegionsTool,
      media_credits: createMediaCreditsTool(locale),
      person_credits: createPersonCreditsTool(locale),
      present_person: presentPersonTool,
      review_summary: createReviewSummaryTool(locale),
      save_preference: savePreferenceTool,
      web_search: anthropic.tools.webSearch_20250305(
        countryCode && countryCode !== "unknown"
          ? {
              maxUses: 3,
              userLocation: {
                type: "approximate",
                country: countryCode,
              },
            }
          : { maxUses: 3 },
      ),
    },
    providerOptions: contextManagementProviderOptions,
    stopWhen: isStepCount(5),
    prepareStep: ({ messages, model }) => ({
      messages: addCacheControlToMessages({ messages, model }),
    }),
  });
}
