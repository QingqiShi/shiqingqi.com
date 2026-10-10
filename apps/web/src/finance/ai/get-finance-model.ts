import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicModel } from "#src/anthropic/get-anthropic-model.ts";

/**
 * The model of the labelling pipeline, or null when no provider key is set.
 * Every AI function takes the model as a parameter, so a change of provider
 * changes only this file.
 */
export function getFinanceModel(): LanguageModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return getAnthropicModel();
}
