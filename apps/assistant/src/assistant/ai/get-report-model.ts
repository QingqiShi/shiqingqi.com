import "server-only";
import { getAnthropicProvider } from "./get-anthropic-provider.ts";
import type { AssistantModel } from "./types.ts";

const REPORT_MODEL_ID = "claude-sonnet-5-5";

let reporter: AssistantModel | null = null;

/** The model that writes the morning report and its to-dos, or null when `ANTHROPIC_API_KEY` is not set. */
export function getReportModel(): AssistantModel | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  reporter ??= {
    id: REPORT_MODEL_ID,
    model: getAnthropicProvider().chat(REPORT_MODEL_ID),
  };
  return reporter;
}
