import { getAnthropicProvider } from "@tuja/server-clients/get-anthropic-provider";
import type { LanguageModel } from "ai";
import "server-only";

const MODEL_ID = "claude-sonnet-5-5";

let model: LanguageModel | null = null;

export function getAnthropicModel(): LanguageModel {
  if (!model) {
    model = getAnthropicProvider().chat(MODEL_ID);
  }
  return model;
}
