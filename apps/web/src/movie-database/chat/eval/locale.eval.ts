import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-single-turn-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "English input with zh locale responds in Chinese",
    input: "What is a good horror movie?",
    locale: "zh",
    criteria: [
      "The response is in Chinese, not English",
      "Recommends or discusses horror movies",
    ],
    deterministic: [
      {
        type: "matches",
        value: "[\\u4e00-\\u9fff]",
        label: "Response should contain CJK characters",
      },
    ],
  },
];

describe("Locale", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
