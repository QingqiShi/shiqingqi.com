import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Mood-based recommendation",
    input: "I'm feeling melancholic, what should I watch?",
    criteria: [
      "Recommendations match a melancholic or reflective mood",
      "Includes at least 2 titles with years in parentheses",
    ],
  },
  {
    name: "Uses semantic_search tool",
    input: "Good Korean thriller movies?",
    criteria: ["Recommends Korean thriller movies"],
    requireToolCall: "semantic_search",
  },
  {
    name: "Director comparison",
    input: "Compare Kubrick and Tarkovsky as directors",
    criteria: [
      "Discusses both Stanley Kubrick and Andrei Tarkovsky",
      "References at least one specific film from each director",
    ],
  },
  {
    name: "Trivia request",
    input: "Tell me some behind-the-scenes facts about The Shining",
    criteria: [
      "Provides at least 2 plausible behind-the-scenes facts about The Shining",
      "Facts are related to the production, filming, or making of the movie",
    ],
  },
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
