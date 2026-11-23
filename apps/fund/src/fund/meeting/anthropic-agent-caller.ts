import type { AnthropicProvider } from "@ai-sdk/anthropic";
import {
  APICallError,
  generateText,
  isStepCount,
  NoObjectGeneratedError,
  Output,
  type ModelMessage,
  type StepResult,
  type ToolSet,
} from "ai";
import { estimateCostUsd, usesDynamicWebSearch } from "../agents/model-for.ts";
import type { StepUsage } from "../contracts/step-usage-schema.ts";
import { AgentCallError } from "./agent-call-error.ts";
import type { AgentCaller, AgentRequest } from "./types.ts";

/** A server-side search loop can pause; the turn then goes on in a new request. */
const MAX_CONTINUATIONS = 3;

/** The provider gives a failed search as a result that has an `errorCode`. */
const SEARCH_ERROR_CODE = /"errorCode":"([a-z_]+)"/;

function usageOf(modelId: string, steps: readonly StepResult<ToolSet>[]) {
  const use = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    webSearches: 0,
  };
  const webSearchErrors: string[] = [];
  for (const step of steps) {
    use.inputTokens += step.usage.inputTokens ?? 0;
    use.outputTokens += step.usage.outputTokens ?? 0;
    use.cacheReadTokens += step.usage.inputTokenDetails.cacheReadTokens ?? 0;
    use.cacheWriteTokens += step.usage.inputTokenDetails.cacheWriteTokens ?? 0;
    for (const part of step.content) {
      if (part.type === "tool-call" && part.toolName === "web_search") {
        use.webSearches += 1;
      }
      if (
        (part.type === "tool-error" || part.type === "tool-result") &&
        part.toolName === "web_search"
      ) {
        const code = SEARCH_ERROR_CODE.exec(JSON.stringify(part))?.[1];
        if (code !== undefined) webSearchErrors.push(code);
        else if (part.type === "tool-error") webSearchErrors.push("error");
      }
    }
  }
  return {
    ...use,
    ...(webSearchErrors.length > 0 ? { webSearchErrors } : {}),
    costUsd: estimateCostUsd(modelId, use),
  };
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Calls Claude through the AI SDK: web search when asked, a structured answer always. */
export function anthropicAgentCaller(
  anthropic: AnthropicProvider,
): AgentCaller {
  return async <T>(request: AgentRequest<T>) => {
    const { modelId, webSearch } = request;
    const tools: ToolSet | undefined = webSearch
      ? {
          web_search: usesDynamicWebSearch(modelId)
            ? anthropic.tools.webSearch_20260209({ maxUses: webSearch.maxUses })
            : anthropic.tools.webSearch_20250305({
                maxUses: webSearch.maxUses,
              }),
        }
      : undefined;
    const signal = AbortSignal.timeout(request.timeoutMs);
    const steps: StepResult<ToolSet>[] = [];
    const messages: ModelMessage[] = [
      { role: "user", content: request.message },
    ];
    const usage = (): StepUsage => usageOf(modelId, steps);

    try {
      for (let turn = 0; ; turn++) {
        const turnState = { paused: false };
        try {
          const result = await generateText({
            model: anthropic(modelId),
            instructions: request.instructions,
            messages,
            tools,
            output: Output.object({ schema: request.schema }),
            providerOptions: { anthropic: { effort: request.effort } },
            stopWhen: isStepCount(1),
            maxOutputTokens: request.maxOutputTokens,
            maxRetries: 2,
            abortSignal: signal,
            onStepEnd: (step) => {
              steps.push(step);
              turnState.paused = step.rawFinishReason === "pause_turn";
              if (turnState.paused) messages.push(...step.response.messages);
            },
          });
          return {
            output: result.output,
            model: result.finalStep.response.modelId,
            usage: usage(),
          };
        } catch (error) {
          if (
            turnState.paused &&
            turn < MAX_CONTINUATIONS &&
            NoObjectGeneratedError.isInstance(error)
          ) {
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        if (error.finishReason === "content-filter") {
          throw new AgentCallError("refusal", "The model refused to answer.", {
            transient: false,
            usage: usage(),
          });
        }
        if (error.finishReason === "length") {
          throw new AgentCallError(
            "cut_off",
            `The answer was cut off at ${String(request.maxOutputTokens)} output tokens.`,
            { transient: true, usage: usage() },
          );
        }
        throw new AgentCallError(
          "invalid_output",
          `The answer did not match its schema: ${messageOf(error.cause ?? error).slice(0, 500)}`,
          { transient: true, usage: usage() },
        );
      }
      if (isTimeout(error) || signal.aborted) {
        throw new AgentCallError(
          "timeout",
          `No answer within ${String(Math.round(request.timeoutMs / 1000))} s.`,
          { transient: true, usage: usage() },
        );
      }
      if (APICallError.isInstance(error)) {
        throw new AgentCallError(
          "api",
          `The API answered ${String(error.statusCode ?? "")}: ${error.message.slice(0, 500)}`,
          {
            transient: error.isRetryable,
            usage: usage(),
          },
        );
      }
      throw new AgentCallError("api", messageOf(error).slice(0, 500), {
        transient: true,
        usage: usage(),
      });
    }
  };
}
