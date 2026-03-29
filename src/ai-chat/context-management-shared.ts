/**
 * Compaction threshold in input tokens.
 * Shared between server (context-management.ts) and client (usage indicator).
 */
export const COMPACTION_TRIGGER_TOKENS = 100_000;

/**
 * Ratio of compaction threshold at which the usage indicator appears.
 * 0.6 = indicator shows at 60k tokens (60% of 100k compaction threshold).
 */
export const USAGE_WARNING_RATIO = 0.6;

/**
 * Two complementary context-management strategies for long conversations:
 *
 * 1. **Tool result clearing** — fires at 80k input tokens, drops old search
 *    results (rich movie objects) while keeping the 3 most recent tool uses.
 * 2. **Auto-compaction** — fires at 100k input tokens if clearing wasn't
 *    enough, summarising the conversation with domain-aware instructions.
 *
 * Claude Sonnet 4.6 has a 200k context window. Triggering at 40%/50% leaves
 * headroom and avoids quality degradation ("context rot") that occurs well
 * before the hard limit.
 */
export const CONTEXT_MANAGEMENT_CONFIG = {
  edits: [
    // Strategy A: clear old tool results first (cheaper than compaction)
    {
      type: "clear_tool_uses_20250919",
      trigger: { type: "input_tokens", value: 80_000 },
      keep: { type: "tool_uses", value: 3 },
      clearAtLeast: { type: "input_tokens", value: 5_000 },
      clearToolInputs: true,
      excludeTools: ["present_media"],
    },
    // Strategy B: compaction as a fallback when clearing isn't enough
    {
      type: "compact_20260112",
      trigger: { type: "input_tokens", value: COMPACTION_TRIGGER_TOKENS },
      pauseAfterCompaction: false,
      instructions:
        "Summarise this movie/TV recommendation conversation. Preserve: exact titles with release years, user preference signals (liked/disliked genres, actors, moods), recommendation outcomes (accepted, rejected, saved for later), and any ongoing request. Drop: search result details, plot summaries already discussed, and tool call mechanics.",
    },
  ],
};
