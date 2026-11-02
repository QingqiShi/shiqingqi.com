/** One step of an agent run as `agent_runs.transcript` keeps it: each value cut short. */
export interface AgentStepRecord {
  text: string | null;
  calls: { id: string; tool: string; input: string }[];
  results: { id: string; tool: string; output: string }[];
  finishReason: string;
}

export interface ModelTokens {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/** The tokens of a run, by model id: the main agent and each sub-agent it called. */
export type AgentUsage = Record<string, ModelTokens>;
