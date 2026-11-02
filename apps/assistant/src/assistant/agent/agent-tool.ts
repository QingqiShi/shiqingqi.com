import { anthropic } from "@ai-sdk/anthropic";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

/** A guardrail said no. The model gets the message, and the run goes on. */
export class ToolRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolRefusal";
  }
}

/**
 * A tool that an agent can call, free of any one framework: the AI SDK
 * runner wraps it with `toAiTools`, and an MCP server could wrap the same.
 */
export interface AgentTool {
  description: string;
  inputSchema: z.ZodType;
  /**
   * Whether the model gets the tool's schema from the start. The other tools
   * wait until the model finds them with the tool search, so that a run does
   * not pay for the schemas of tools it does not use.
   */
  loadUpFront: boolean;
  /** Checks the input again with `inputSchema`, so that no caller can skip the check. */
  execute: (input: unknown) => Promise<unknown>;
}

export type AgentTools = Record<string, AgentTool>;

export function agentTool<Schema extends z.ZodType>(definition: {
  description: string;
  inputSchema: Schema;
  loadUpFront?: boolean;
  execute: (input: z.output<Schema>) => Promise<unknown>;
}): AgentTool {
  return {
    description: definition.description,
    inputSchema: definition.inputSchema,
    loadUpFront: definition.loadUpFront ?? false,
    execute: (input) => definition.execute(definition.inputSchema.parse(input)),
  };
}

const MAX_ERROR_CHARS = 300;

/** What the model gets back from a refused or failed call. */
interface ToolErrorResult {
  error: string;
}

/**
 * Runs a tool and turns every error into a result for the model, so that a
 * refusal or a failed server command never stops the run.
 */
export async function callAgentTool(
  agentTool: AgentTool,
  input: unknown,
): Promise<unknown> {
  try {
    return await agentTool.execute(input);
  } catch (error) {
    if (error instanceof ToolRefusal) {
      return { error: error.message } satisfies ToolErrorResult;
    }
    if (error instanceof z.ZodError) {
      return {
        error: `Invalid input: ${z.prettifyError(error)}`.slice(
          0,
          MAX_ERROR_CHARS,
        ),
      } satisfies ToolErrorResult;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("Agent tool failed", message);
    return {
      error: `The call failed: ${message}`.slice(0, MAX_ERROR_CHARS),
    } satisfies ToolErrorResult;
  }
}

/** The name of Anthropic's tool search in a run's tool set. */
export const TOOL_SEARCH = "tool_search";

/**
 * The AI SDK tools of a run. A tool that does not load up front is deferred,
 * and Anthropic's BM25 tool search, which loads at once, finds it for the
 * model. The API needs at least one tool that loads up front.
 */
export function toAiTools(tools: AgentTools): ToolSet {
  const entries = Object.entries(tools);
  if (
    entries.length > 0 &&
    entries.every(([, { loadUpFront }]) => !loadUpFront)
  ) {
    throw new Error("At least one agent tool must load up front");
  }
  const aiTools: ToolSet = Object.fromEntries(
    entries.map(([name, agentTool]) => [
      name,
      tool({
        description: agentTool.description,
        inputSchema: agentTool.inputSchema,
        execute: (input) => callAgentTool(agentTool, input),
        providerOptions: agentTool.loadUpFront
          ? undefined
          : { anthropic: { deferLoading: true } },
      }),
    ]),
  );
  if (entries.some(([, { loadUpFront }]) => !loadUpFront)) {
    aiTools[TOOL_SEARCH] = anthropic.tools.toolSearchBm25_20251119();
  }
  return aiTools;
}
