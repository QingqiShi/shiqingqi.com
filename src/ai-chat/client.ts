import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import "server-only";

const MODEL_ID = "claude-sonnet-4-6";

let model: LanguageModel | null = null;

export function getAnthropicModel(): LanguageModel {
  if (!model) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    model = anthropic.chat(MODEL_ID);
  }
  return model;
}
