import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import "server-only";

const MODEL_ID = "claude-sonnet-4-6";

let provider: ReturnType<typeof createAnthropic> | null = null;
let model: LanguageModel | null = null;

export function getAnthropicProvider() {
  if (!provider) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}

export function getAnthropicModel(): LanguageModel {
  if (!model) {
    model = getAnthropicProvider().chat(MODEL_ID);
  }
  return model;
}
