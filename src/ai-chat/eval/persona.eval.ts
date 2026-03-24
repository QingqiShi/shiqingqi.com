import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Conversational and enthusiastic tone",
    input: "I just watched Inception and loved it, what should I watch next?",
    criteria: [
      "Uses a warm, conversational, and enthusiastic tone",
      "Includes at least one movie recommendation with title and year",
    ],
  },
  {
    name: "Asks follow-up for broad request",
    input: "Recommend me something good",
    criteria: [
      "Asks at least one follow-up question to narrow down preferences (e.g. genre, mood, type)",
    ],
  },
  {
    name: "Opinionated on directors",
    input: "What do you think of Christopher Nolan?",
    criteria: [
      "Expresses a clear opinion or perspective on Christopher Nolan as a filmmaker",
      "Mentions at least one specific film by Nolan",
    ],
  },
  {
    name: "Title and year format",
    input:
      "What are the best mind-bending sci-fi movies like Inception and The Matrix?",
    criteria: [
      "Recommends movies relevant to mind-bending sci-fi",
      "Includes at least one title with year in parentheses format",
    ],
    deterministic: [
      {
        type: "matches",
        value: "\\(\\d{4}\\)",
        label: "Response should include year in parentheses",
      },
    ],
  },
];

describe("Persona", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
