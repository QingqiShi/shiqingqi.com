import type { LanguageModelUsage, ProviderMetadata } from "ai";
import { z } from "zod";
import type { ModelUse } from "./empty-use.ts";

const anthropicPasses = z.object({
  anthropic: z.object({
    iterations: z.array(
      z.object({
        type: z.string(),
        inputTokens: z.number(),
        outputTokens: z.number(),
        cacheReadInputTokens: z.number().optional(),
        cacheCreationInputTokens: z.number().optional(),
      }),
    ),
  }),
});

/**
 * Adds what one step of the model used. When the API compacts the context
 * in the step, it bills each pass, and the step's usage can keep the cache
 * tokens of the last pass only; then the passes give the billed numbers.
 */
export function addStepUse(
  use: ModelUse,
  step: { usage: LanguageModelUsage; providerMetadata?: ProviderMetadata },
): void {
  use.rounds += 1;
  const parsed = anthropicPasses.safeParse(step.providerMetadata);
  const passes = parsed.success ? parsed.data.anthropic.iterations : [];
  const billed =
    passes.some((pass) => pass.type === "compaction") &&
    !passes.some((pass) => pass.type === "fallback_message")
      ? passes.filter(
          (pass) => pass.type === "compaction" || pass.type === "message",
        )
      : [];
  const details = step.usage.inputTokenDetails;
  const cacheRead = Math.max(
    details.cacheReadTokens ?? 0,
    sum(billed.map((pass) => pass.cacheReadInputTokens ?? 0)),
  );
  const cacheWrite = Math.max(
    details.cacheWriteTokens ?? 0,
    sum(billed.map((pass) => pass.cacheCreationInputTokens ?? 0)),
  );
  // The provider sums the uncached input of all passes already.
  const uncached =
    details.noCacheTokens ??
    (step.usage.inputTokens ?? 0) -
      (details.cacheReadTokens ?? 0) -
      (details.cacheWriteTokens ?? 0);
  use.inputTokens += uncached + cacheRead + cacheWrite;
  use.outputTokens += step.usage.outputTokens ?? 0;
  use.cacheReadTokens += cacheRead;
  use.cacheWriteTokens += cacheWrite;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
