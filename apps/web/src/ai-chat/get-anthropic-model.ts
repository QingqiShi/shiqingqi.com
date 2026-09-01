import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicProvider } from "./get-anthropic-provider";

const MODEL_ID = "claude-sonnet-4-6";

let model: LanguageModel | null = null;

export function getAnthropicModel(): LanguageModel {
  if (!model) {
    model = getAnthropicProvider().chat(MODEL_ID);
  }
  return model;
}
