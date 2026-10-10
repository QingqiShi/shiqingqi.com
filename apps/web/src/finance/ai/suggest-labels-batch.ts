import type { LanguageModel } from "ai";
import { suggestLabelsFromMemory } from "./suggest-labels-from-memory.ts";
import {
  MODEL_BATCH_SIZE,
  suggestLabelsWithModel,
  type ModelLabelInput,
} from "./suggest-labels-with-model.ts";
import type { LabelMemory, Suggestion } from "./types.ts";

interface SuggestLabelsDependencies {
  /** Null when no model is set up: only the alias and history steps run. */
  model: LanguageModel | null;
  onModelError?: (error: unknown) => void;
}

/**
 * Labels many inputs: each goes through the alias and history steps, and the
 * ones still without labels go to the model in batches. An input with no
 * Suggestion is missing from the result, also when the model call fails.
 */
export async function suggestLabelsBatch(
  memory: LabelMemory,
  inputs: readonly ModelLabelInput[],
  dependencies: SuggestLabelsDependencies,
): Promise<Map<string, Suggestion>> {
  const suggestions = new Map<string, Suggestion>();
  const rest: ModelLabelInput[] = [];
  for (const input of inputs) {
    const suggestion = suggestLabelsFromMemory(input, memory);
    if (suggestion) suggestions.set(input.key, suggestion);
    else rest.push(input);
  }
  if (rest.length === 0 || !dependencies.model) return suggestions;

  for (let start = 0; start < rest.length; start += MODEL_BATCH_SIZE) {
    try {
      const labelled = await suggestLabelsWithModel(
        dependencies.model,
        memory,
        rest.slice(start, start + MODEL_BATCH_SIZE),
      );
      for (const [key, suggestion] of labelled) {
        suggestions.set(key, suggestion);
      }
    } catch (error) {
      dependencies.onModelError?.(error);
    }
  }
  return suggestions;
}
