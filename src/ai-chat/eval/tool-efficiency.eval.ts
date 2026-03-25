import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Similarity query uses semantic_search, not tmdb_search to verify",
    input: "有没有类似黑钱胜地的电影",
    locale: "zh",
    criteria: [
      "Recommends movies similar to Ozark (黑钱胜地) — crime, money laundering, or dark drama themes",
      "Calls present_media to display results visually",
      "Does NOT call tmdb_search repeatedly to verify or look up titles returned by semantic_search — semantic results should be trusted directly",
    ],
    requireToolCall: "semantic_search",
    includeToolCalls: true,
  },
  {
    name: "Mood-based query goes straight to semantic search and presents",
    input: "I want something like Breaking Bad but more international",
    criteria: [
      "Recommends international crime or drug-related dramas",
      "Calls present_media to display results visually",
      "Does NOT use tmdb_search to verify semantic_search results — should trust semantic results and present them directly",
    ],
    requireToolCall: "semantic_search",
    includeToolCalls: true,
  },
];

describe("Tool efficiency", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
