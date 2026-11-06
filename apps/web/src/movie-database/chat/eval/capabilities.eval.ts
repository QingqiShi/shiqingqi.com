import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-single-turn-eval";
import type { EvalCase } from "./types";

const NO_REDUNDANT_SEARCH =
  "Judging only tmdb_search calls: none of them looks up a title that an earlier tmdb_discover or tmdb_recommendations call already returned, and no title is searched twice. Repeated classify_mood calls are allowed";

const cases: EvalCase[] = [
  {
    name: "Similarity query grounds its picks without redundant searches",
    input: "有没有类似黑钱胜地的电影",
    locale: "zh",
    criteria: [
      "Recommends titles similar to Ozark (黑钱胜地) — crime, money laundering, or dark drama themes",
      "Calls present_media to display results visually",
      NO_REDUNDANT_SEARCH,
    ],
    requireToolCall: "present_media",
    includeToolCalls: true,
  },
  {
    name: "Mood query resolves its own picks with tmdb_search",
    input: "I want a cozy mystery to watch on a rainy evening",
    criteria: [
      "Recommends several mystery titles with a cozy, light, or comforting tone",
      "Calls present_media to display results visually",
      "Every ID passed to present_media appears in what a tmdb_search, tmdb_discover, or tmdb_recommendations call returned",
      NO_REDUNDANT_SEARCH,
    ],
    requireToolCall: "tmdb_search",
    forbidToolCall: "web_search",
    includeToolCalls: true,
  },
  {
    name: "Filter query uses tmdb_discover",
    input: "What are the highest rated Korean thriller movies from the 2010s?",
    criteria: [
      "Recommends Korean thriller movies released between 2010 and 2019",
      "Calls present_media to display results visually",
      NO_REDUNDANT_SEARCH,
    ],
    requireToolCall: "tmdb_discover",
    includeToolCalls: true,
  },
];

describe("Capabilities", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
