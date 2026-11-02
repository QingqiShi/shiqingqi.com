import type { LanguageModel } from "ai";

/** A model with the id that is stored with its results. */
export interface AssistantModel {
  id: string;
  model: LanguageModel;
}
