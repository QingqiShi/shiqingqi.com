import "server-only";
import { getAnthropicProvider } from "./get-anthropic-provider.ts";
import type { AssistantModel } from "./types.ts";

const AGENT_MODEL_ID = "claude-sonnet-5-5";
const READER_MODEL_ID = "claude-haiku-5-5";

export interface AgentModels {
  /** The main agent: it has the tools that change the mailbox. */
  agent: AssistantModel;
  /** The reader sub-agent: it reads mail text and has no tools. */
  reader: AssistantModel;
}

let models: AgentModels | null = null;

/**
 * The models of the agent runs, or null when `ANTHROPIC_API_KEY` is not set.
 * Every AI function takes its model as a parameter, so a change of model
 * changes only this file.
 */
export function getAgentModels(): AgentModels | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const provider = getAnthropicProvider();
  models ??= {
    agent: { id: AGENT_MODEL_ID, model: provider.chat(AGENT_MODEL_ID) },
    reader: { id: READER_MODEL_ID, model: provider.chat(READER_MODEL_ID) },
  };
  return models;
}
