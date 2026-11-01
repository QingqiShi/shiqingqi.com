import "server-only";
import { getAnthropicProvider } from "./get-anthropic-provider.ts";
import type { AssistantModel } from "./get-classifier-model.ts";

const EDITOR_MODEL_ID = "claude-sonnet-5-5";

let editor: AssistantModel | null = null;

/**
 * The model that arranges the daily digest and drafts sender rules from
 * corrections, or null when `ANTHROPIC_API_KEY` is not set.
 */
export function getEditorModel(): AssistantModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  editor ??= {
    id: EDITOR_MODEL_ID,
    model: getAnthropicProvider().chat(EDITOR_MODEL_ID),
  };
  return editor;
}
