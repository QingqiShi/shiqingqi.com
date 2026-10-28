import { describe, it } from "vitest";
import { runMultiTurnEval } from "./run-multi-turn-eval";
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
];

describe("Multi-turn", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runMultiTurnEval(evalCase);
  });
});
