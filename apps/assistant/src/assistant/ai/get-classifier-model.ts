import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicProvider } from "./get-anthropic-provider.ts";

const CLASSIFIER_MODEL_ID = "claude-haiku-5-5";

/** A model with the id that is stored with its results. */
export interface AssistantModel {
  id: string;
  model: LanguageModel;
}

let classifier: AssistantModel | null = null;

/**
 * The model that classifies each mail, or null when `ANTHROPIC_API_KEY` is
 * not set. Every AI function takes its model as a parameter, so a change of
 * model changes only this file.
 */
export function getClassifierModel(): AssistantModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  classifier ??= {
    id: CLASSIFIER_MODEL_ID,
    model: getAnthropicProvider().chat(CLASSIFIER_MODEL_ID),
  };
  return classifier;
}
