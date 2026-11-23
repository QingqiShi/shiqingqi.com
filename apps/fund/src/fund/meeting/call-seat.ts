import type { z } from "zod";
import { modelFor, type ModelTier, type Role } from "../agents/model-for.ts";
import { estimateCostUsd } from "../agents/model-for.ts";
import type { StepUsage } from "../contracts/step-usage-schema.ts";
import { AgentCallError } from "./agent-call-error.ts";
import { renderPack } from "./render-pack.ts";
import { DeadlineReached, StepFailure } from "./step-failure.ts";
import type { PackSection, StepContext } from "./types.ts";

const SECOND = 1000;

/** The longest one model call of each seat may take. Fable thinks for minutes. */
const TIMEOUT_MS: Record<ModelTier, Record<Role, number>> = {
  dev: {
    strategist: 240 * SECOND,
    analyst: 240 * SECOND,
    pm: 300 * SECOND,
    risk: 240 * SECOND,
  },
  live: {
    strategist: 480 * SECOND,
    analyst: 480 * SECOND,
    pm: 660 * SECOND,
    risk: 480 * SECOND,
  },
};

/** Thinking counts against this, so it is far above the size of an answer. */
const MAX_OUTPUT_TOKENS: Record<ModelTier, number> = {
  dev: 32_000,
  live: 64_000,
};

export const WEB_SEARCHES = { strategist: 6, analyst: 4 } as const;

function addUsage(a: StepUsage | null, b: StepUsage | null): StepUsage | null {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    webSearches: a.webSearches + b.webSearches,
    webSearchErrors: [
      ...(a.webSearchErrors ?? []),
      ...(b.webSearchErrors ?? []),
    ],
    costUsd: a.costUsd + b.costUsd,
  };
}

/**
 * Asks one seat for a structured answer to `sections`. A transient failure
 * gets one retry when there is time for it. It throws `DeadlineReached` when
 * the call cannot end before the deadline, and `StepFailure` when there is
 * no valid answer.
 */
export async function callSeat<T>(
  ctx: StepContext,
  {
    role,
    instructions,
    schema,
    sections,
    webSearch,
  }: {
    role: Role;
    instructions: string;
    schema: z.ZodType<T>;
    sections: PackSection[];
    webSearch: number | null;
  },
): Promise<{
  input: PackSection[];
  output: T;
  model: string;
  usage: StepUsage;
}> {
  const tier = ctx.run.modelTier;
  const { id, effort } = modelFor(tier, role);
  const timeoutMs = TIMEOUT_MS[tier][role];
  const hasTime = () => ctx.deadline - ctx.deps.now().getTime() >= timeoutMs;
  if (!hasTime()) throw new DeadlineReached(ctx.key);

  const message = renderPack(sections);
  let spent: StepUsage | null = null;
  for (let attempt = 0; ; attempt++) {
    try {
      const reply = await ctx.deps.agent({
        stepKey: ctx.key,
        role,
        modelId: id,
        effort,
        instructions,
        message,
        schema,
        webSearch: webSearch === null ? null : { maxUses: webSearch },
        timeoutMs,
        maxOutputTokens: MAX_OUTPUT_TOKENS[tier],
      });
      const usage = addUsage(spent, reply.usage) ?? reply.usage;
      return {
        input: sections,
        output: reply.output,
        model: reply.model,
        usage,
      };
    } catch (error) {
      const failure =
        error instanceof AgentCallError
          ? error
          : new AgentCallError("api", String(error), { transient: true });
      spent = addUsage(spent, failure.usage);
      if (failure.transient && attempt === 0 && hasTime()) continue;
      throw new StepFailure(
        `${failure.failure}: ${failure.message}${attempt > 0 ? " (after one retry)" : ""}`,
        {
          input: sections,
          usage: spent ?? zeroUsage(id),
          model: id,
        },
      );
    }
  }
}

function zeroUsage(modelId: string): StepUsage {
  const use = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    webSearches: 0,
  };
  return { ...use, costUsd: estimateCostUsd(modelId, use) };
}
