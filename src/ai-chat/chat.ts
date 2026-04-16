import type { LanguageModel } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import "server-only";
import { addCacheControlToMessages } from "./addCacheControlToMessages";
import { getAnthropicModel, getAnthropicProvider } from "./client";
import { contextManagementProviderOptions } from "./context-management";
import type { ChatInput } from "./schema";
import { getChatSystemInstructions } from "./system-instructions";
import { createMediaCreditsTool } from "./tools/media-credits";
import { createPersonCreditsTool } from "./tools/person-credits";
import { createPresentMediaTool } from "./tools/present-media";
import { createPresentPersonTool } from "./tools/present-person";
import { createPresentProviderRegionsTool } from "./tools/present-provider-regions";
import { createPresentWatchProvidersTool } from "./tools/present-watch-providers";
import { createReviewSummaryTool } from "./tools/review-summary";
import { createSavePreferenceTool } from "./tools/save-preference";
import { createSemanticSearchTool } from "./tools/semantic-search";
import { createTmdbSearchTool } from "./tools/tmdb-search";
import { createWatchProvidersTool } from "./tools/watch-providers";

interface ChatOptions extends ChatInput {
  model?: LanguageModel;
}

export async function chat({
  messages,
  locale,
  countryCode,
  model,
}: ChatOptions) {
  const system = getChatSystemInstructions(locale, countryCode);
  const modelMessages = await convertToModelMessages(messages);
  const anthropic = getAnthropicProvider();

  return streamText({
    model: model ?? getAnthropicModel(),
    system,
    messages: modelMessages,
    tools: {
      semantic_search: createSemanticSearchTool(locale),
      tmdb_search: createTmdbSearchTool(locale),
      present_media: createPresentMediaTool(),
      watch_providers: createWatchProvidersTool(),
      present_watch_providers: createPresentWatchProvidersTool(),
      present_provider_regions: createPresentProviderRegionsTool(),
      media_credits: createMediaCreditsTool(),
      person_credits: createPersonCreditsTool(locale),
      present_person: createPresentPersonTool(),
      review_summary: createReviewSummaryTool(locale),
      save_preference: createSavePreferenceTool(),
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
    stopWhen: stepCountIs(5),
    prepareStep: ({ messages, model }) => ({
      messages: addCacheControlToMessages({ messages, model }),
    }),
  });
}
