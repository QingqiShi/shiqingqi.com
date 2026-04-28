/**
 * Compaction threshold in input tokens.
 * Shared between server (context-management.ts) and client (usage indicator).
 */
export const COMPACTION_TRIGGER_TOKENS = 100_000;

/**
 * Ratio of compaction threshold at which the usage indicator appears.
 * 0.6 = indicator shows at 60% of compaction threshold.
 */
export const USAGE_WARNING_RATIO = 0.6;

/**
 * Auto-compaction for long conversations.
 *
 * Fires when input tokens reach the compaction threshold, summarising the
 * conversation with domain-aware instructions. Prompt caching keeps
 * per-message costs low until that point, so no intermediate clearing is
 * needed.
 *
 * Claude Sonnet 4.6 has a 200k context window. The production threshold
 * (100k) leaves headroom and avoids quality degradation ("context rot")
 * that occurs well before the hard limit.
 */
export const CONTEXT_MANAGEMENT_CONFIG = {
  edits: [
    {
      type: "compact_20260112",
      trigger: { type: "input_tokens", value: COMPACTION_TRIGGER_TOKENS },
      pauseAfterCompaction: false,
      instructions:
        "Summarise this movie/TV recommendation conversation. Preserve: exact titles with release years, user preference signals (liked/disliked genres, actors, moods), recommendation outcomes (accepted, rejected, saved for later), and any ongoing request. Drop: search result details, plot summaries already discussed, and tool call mechanics.",
    },
  ],
};
