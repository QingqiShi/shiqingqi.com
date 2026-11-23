export type Role = "strategist" | "analyst" | "pm" | "risk";
export type ModelTier = "dev" | "live";
export type Effort = "low" | "medium" | "high";

export interface RoleModel {
  id: string;
  effort: Effort;
}

const HAIKU = "claude-haiku-5-5";
const FABLE = "claude-fable-5-2";

/**
 * The model of each seat at the meeting. `dev` is the cheapest model, for
 * work on the app; `live` is the real fund. To run the analysts of the live
 * fund on a cheaper model, change the one `analyst` line.
 */
const MODELS: Record<ModelTier, Record<Role, RoleModel>> = {
  dev: {
    strategist: { id: HAIKU, effort: "low" },
    analyst: { id: HAIKU, effort: "low" },
    pm: { id: HAIKU, effort: "medium" },
    risk: { id: HAIKU, effort: "medium" },
  },
  live: {
    strategist: { id: FABLE, effort: "medium" },
    analyst: { id: FABLE, effort: "low" },
    pm: { id: FABLE, effort: "high" },
    risk: { id: FABLE, effort: "medium" },
  },
};

export function modelFor(tier: ModelTier, role: Role): RoleModel {
  return MODELS[tier][role];
}

export function modelTierFromEnv(value: string | undefined): ModelTier {
  return value === "live" ? "live" : "dev";
}

/** Only the newer search tool can filter its own results; Haiku cannot use it. */
export function usesDynamicWebSearch(modelId: string): boolean {
  return !modelId.startsWith("claude-haiku");
}

/** USD for one million tokens, from the public price list. */
const PRICES: Partial<Record<string, { input: number; output: number }>> = {
  [HAIKU]: { input: 0.1, output: 0.5 },
  [FABLE]: { input: 8, output: 40 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

const WEB_SEARCH_USD = 0.01;

export function estimateCostUsd(
  modelId: string,
  use: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    webSearches: number;
  },
): number {
  const price = PRICES[modelId];
  if (price === undefined) return 0;
  const uncached = Math.max(
    0,
    use.inputTokens - use.cacheReadTokens - use.cacheWriteTokens,
  );
  const input =
    uncached + use.cacheWriteTokens * 1.25 + use.cacheReadTokens * 0.1;
  return (
    (input * price.input + use.outputTokens * price.output) / 1_000_000 +
    use.webSearches * WEB_SEARCH_USD
  );
}
