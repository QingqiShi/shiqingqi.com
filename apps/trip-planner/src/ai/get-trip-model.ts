import { getAnthropicProvider } from "@tuja/server-clients/get-anthropic-provider";
import type { LanguageModel } from "ai";
import "server-only";

/** The model that writes the summary of a conversation. */
const TRIP_MODEL_ID = "claude-haiku-5-5";

/** The model, or null when `ANTHROPIC_API_KEY` is not set. */
export function getTripModel(): LanguageModel | null {
  return process.env.ANTHROPIC_API_KEY
    ? getAnthropicProvider().chat(TRIP_MODEL_ID)
    : null;
}
