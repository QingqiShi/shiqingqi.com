import { createAnthropic } from "@ai-sdk/anthropic";
import "server-only";

let provider: ReturnType<typeof createAnthropic> | null = null;

export function getAnthropicProvider() {
  if (!provider) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    provider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return provider;
}
