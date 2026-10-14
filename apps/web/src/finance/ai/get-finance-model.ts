import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicProvider } from "#src/anthropic/get-anthropic-provider.ts";

const FINANCE_MODEL_ID = "claude-sonnet-5-5";
const INSTITUTION_DOMAIN_MODEL_ID = "claude-haiku-5-5";

const models = new Map<string, LanguageModel>();

function getModel(modelId: string): LanguageModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  let model = models.get(modelId);
  if (!model) {
    model = getAnthropicProvider().chat(modelId);
    models.set(modelId, model);
  }
  return model;
}

/**
 * The model of the labelling pipeline, or null when no provider key is set.
 * Every AI function takes the model as a parameter, so a change of provider
 * changes only this file.
 */
export function getFinanceModel(): LanguageModel | null {
  return getModel(FINANCE_MODEL_ID);
}

/** The model that guesses institution websites, or null when no provider key is set. */
export function getInstitutionDomainModel(): LanguageModel | null {
  return getModel(INSTITUTION_DOMAIN_MODEL_ID);
}
