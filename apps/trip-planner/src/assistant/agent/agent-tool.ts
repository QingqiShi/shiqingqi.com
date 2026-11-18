import { z } from "zod";
import { describeError } from "#src/assistant/describe-error.ts";

/** A guardrail said no. The model gets the message, and the turn goes on. */
export class ToolRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolRefusal";
  }
}

/** What a tool knows of the call that runs it. */
export interface ToolCall {
  toolCallId: string;
}

/**
 * A tool that the assistant can call, free of any one framework: the turn
 * runner wraps it for the AI SDK, and an MCP server could wrap the same.
 */
export interface AgentTool {
  description: string;
  inputSchema: z.ZodType;
  /** Checks the input again with `inputSchema`, so that no caller can skip the check. */
  execute: (input: unknown, call: ToolCall) => Promise<unknown>;
}

export function agentTool<Schema extends z.ZodType>(definition: {
  description: string;
  inputSchema: Schema;
  execute: (input: z.output<Schema>, call: ToolCall) => Promise<unknown>;
}): AgentTool {
  return {
    description: definition.description,
    inputSchema: definition.inputSchema,
    execute: (input, call) =>
      definition.execute(definition.inputSchema.parse(input), call),
  };
}

const MAX_ERROR_CHARS = 300;

/** What the model gets back from a refused or failed call. */
export interface ToolErrorResult {
  error: string;
}

/**
 * Runs a tool and turns every error into a result for the model, so that a
 * refusal or a failed write never stops the turn.
 */
export async function callAgentTool(
  tool: AgentTool,
  input: unknown,
  call: ToolCall,
): Promise<unknown> {
  try {
    return await tool.execute(input, call);
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
    console.error("Assistant tool failed:", describeError(error));
    return {
      error: "The call failed on the server. Nothing changed. Try again later.",
    } satisfies ToolErrorResult;
  }
}
