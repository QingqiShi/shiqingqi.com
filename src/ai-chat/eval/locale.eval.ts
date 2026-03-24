import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Chinese response for zh locale",
    input: "推荐一部科幻电影",
    locale: "zh",
    criteria: [
      "The response is entirely in Chinese",
      "Recommends at least one sci-fi movie",
    ],
    deterministic: [
      {
        type: "matches",
        value: "[\\u4e00-\\u9fff]",
        label: "Response should contain CJK characters",
      },
    ],
  },
  {
    name: "English response for en locale",
    input: "Recommend a good comedy",
    locale: "en",
    criteria: [
      "The response is entirely in English",
      "Recommends at least one comedy movie or TV show",
    ],
  },
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
