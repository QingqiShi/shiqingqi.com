import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-single-turn-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Similarity query uses semantic_search without verifying via tmdb_search",
    input: "有没有类似黑钱胜地的电影",
    locale: "zh",
    criteria: [
      "Recommends movies similar to Ozark (黑钱胜地) — crime, money laundering, or dark drama themes",
      "Calls present_media to display results visually",
      "It is acceptable to call tmdb_search once to look up the specific title the user mentioned (Ozark/黑钱胜地), but it must NOT call tmdb_search to verify or re-search titles returned by semantic_search results",
    ],
    requireToolCall: "semantic_search",
    includeToolCalls: true,
  },
];

describe("Capabilities", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
