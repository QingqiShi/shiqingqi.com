import type { SupportedLocale } from "../../types";

export type DeterministicCheck =
  | {
      type: "matches" | "not-matches" | "contains" | "not-contains";
      value: string;
      label: string;
    }
  | { type: "min-length"; value: number; label: string };

export interface EvalCase {
  name: string;
  input: string;
  locale?: SupportedLocale;
  criteria: string[];
  deterministic?: DeterministicCheck[];
  includeToolCalls?: boolean;
  requireToolCall?: string;
  forbidToolCall?: string;
}

export interface MultiTurnEvalCase {
  name: string;
  turns: ReadonlyArray<{ content: string }>;
  locale?: SupportedLocale;
  criteria: string[];
  judgeTurnIndex?: number;
  deterministic?: DeterministicCheck[];
  includeToolCalls?: boolean;
  requireToolCall?: string;
  forbidToolCall?: string;
}

export interface ToolCallSummary {
  toolName: string;
  args: unknown;
}

export interface ChatResponse {
  text: string;
  toolCalls: ToolCallSummary[];
}
