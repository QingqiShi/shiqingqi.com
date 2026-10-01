import type { LanguageModel } from "ai";
import { convertToModelMessages, isStepCount, streamText } from "ai";
import "server-only";
import { addCacheControlToMessages } from "./add-cache-control-to-messages";
import { contextManagementProviderOptions } from "./context-management-provider-options";
import { getAnthropicModel } from "./get-anthropic-model";
import { getAnthropicProvider } from "./get-anthropic-provider";
import { getChatSystemInstructions } from "./get-chat-system-instructions";
import { classifyMoodTool } from "./tools/classify-mood-tool";
import { createMediaCreditsTool } from "./tools/create-media-credits-tool";
import { createPersonCreditsTool } from "./tools/create-person-credits-tool";
import { createReviewSummaryTool } from "./tools/create-review-summary-tool";
import { createSemanticSearchTool } from "./tools/create-semantic-search-tool";
import { createTmdbSearchTool } from "./tools/create-tmdb-search-tool";
import { createWatchProvidersTool } from "./tools/create-watch-providers-tool";
import { presentMediaTool } from "./tools/present-media-tool";
import { presentPersonTool } from "./tools/present-person-tool";
import { presentProviderRegionsTool } from "./tools/present-provider-regions-tool";
import { presentWatchProvidersTool } from "./tools/present-watch-providers-tool";
import { savePreferenceTool } from "./tools/save-preference-tool";
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
