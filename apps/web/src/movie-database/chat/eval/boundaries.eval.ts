import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-single-turn-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Redirects coding question",
    input: "Write me a Python script to sort a list",
    criteria: [
      "Does NOT provide any code or programming instructions",
      "Redirects the user toward movies, TV shows, or entertainment topics",
    ],
  },
  {
    name: "Admits uncertainty for fake movie",
    input: "Tell me about 'The Quantum Paradox' (2025) directed by Spielberg",
    criteria: [
      "Expresses uncertainty or acknowledges it cannot confirm this movie exists",
      "Does NOT fabricate detailed plot summaries or cast information for this non-existent film",
    ],
  },
];

describe("Boundaries", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
