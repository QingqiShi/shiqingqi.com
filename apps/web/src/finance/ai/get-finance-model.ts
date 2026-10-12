import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicProvider } from "#src/anthropic/get-anthropic-provider.ts";

const FINANCE_MODEL_ID = "claude-sonnet-5-5";

let model: LanguageModel | null = null;

/**
 * The model of the labelling pipeline, or null when no provider key is set.
 * Every AI function takes the model as a parameter, so a change of provider
 * changes only this file.
 */
export function getFinanceModel(): LanguageModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  model ??= getAnthropicProvider().chat(FINANCE_MODEL_ID);
  return model;
}
