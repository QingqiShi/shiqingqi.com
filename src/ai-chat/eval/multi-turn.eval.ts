import { describe, it } from "vitest";
import { runMultiTurnEval } from "./run-eval";
import type { MultiTurnEvalCase } from "./types";

const cases: MultiTurnEvalCase[] = [
  {
    name: "Refines by recency",
    turns: [
      {
        content:
          "I love thriller movies like Sicario and No Country for Old Men",
      },
      {
        content:
          "Those are great but a bit old. What about thrillers from the last 2-3 years?",
      },
    ],
    criteria: [
      "The final response includes thriller movie recommendations",
      "The assistant adjusted its recommendations toward more recent titles",
    ],
    requireToolCall: "semantic_search",
  },
  {
    name: "Genre switch",
    turns: [
      { content: "Recommend a horror movie" },
      { content: "Actually, I'd prefer a comedy instead" },
    ],
    criteria: [
      "The final response recommends comedy movies, not horror",
      "The assistant acknowledged and respected the genre change",
    ],
  },
  {
    name: "Context retention",
    turns: [
      { content: "I absolutely loved Parasite" },
      { content: "What else should I watch?" },
    ],
    criteria: [
      "Recommendations are influenced by the user's love of Parasite",
      "Suggestions are thematically or stylistically related to Parasite (e.g. Korean cinema, social commentary, thriller elements)",
    ],
  },
  {
    name: "Topic switch within domain",
    turns: [
      { content: "What are some good sci-fi movies?" },
      { content: "Actually, I'm more in the mood for romantic comedies" },
    ],
    criteria: [
      "The final response recommends romantic comedies, not sci-fi",
      "The assistant pivoted to the new genre within the entertainment domain",
    ],
  },
];

describe("Multi-turn", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runMultiTurnEval(evalCase);
  });
});
