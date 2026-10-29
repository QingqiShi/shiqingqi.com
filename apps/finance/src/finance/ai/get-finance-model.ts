import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { LanguageModel } from "ai";
import "server-only";
import { getAnthropicProvider } from "#src/anthropic/get-anthropic-provider.ts";
import type { LabellingModel } from "./label-bank-rows.ts";

const LABELLING_MODEL_ID = "jev-1.13.0";
const TEACHING_MODEL_ID = "claude-sonnet-5-5";
const INSTITUTION_DOMAIN_MODEL_ID = "claude-haiku-5-5";

const models = new Map<string, LanguageModel>();
let labellingModel: LabellingModel | null = null;

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
 * The Jev model that labels bank rows, or null when `TYPESAFE_API_KEY` is
 * not set. Every AI function takes its model as a parameter, so a change of
 * provider changes only this file.
 */
export function getFinanceModel(): LabellingModel | null {
  if (!process.env.TYPESAFE_API_KEY) return null;
  labellingModel ??= new TypeSafeClient({ defaultModel: LABELLING_MODEL_ID });
  return labellingModel;
}

/** The model that drafts a change to the AI instructions from a Member's correction, or null when no provider key is set. */
export function getTeachingModel(): LanguageModel | null {
  return getModel(TEACHING_MODEL_ID);
}

/** The model that guesses institution websites, or null when no provider key is set. */
export function getInstitutionDomainModel(): LanguageModel | null {
  return getModel(INSTITUTION_DOMAIN_MODEL_ID);
}
