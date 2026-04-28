import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Saves preferences when user expresses likes and dislikes",
    input:
      "I absolutely love sci-fi movies and Christopher Nolan, but I really can't stand horror films.",
    criteria: [
      "Calls the save_preference tool with preferences that capture the user's likes (sci-fi genre, Christopher Nolan as director) and dislike (horror genre)",
      "Responds naturally to the user's stated preferences, e.g. by acknowledging them or offering recommendations",
    ],
    includeToolCalls: true,
    requireToolCall: "save_preference",
  },
];

describe("Save Preference", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
