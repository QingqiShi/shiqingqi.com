import { expect } from "vitest";
import { assertToolCalls } from "./assert-tool-calls";
import { judge } from "./judge";
import { sendMessage } from "./send-message";
import type { EvalCase } from "./types";

export async function runSingleTurnEval(evalCase: EvalCase) {
  const response = await sendMessage(evalCase.input, evalCase.locale);

  assertToolCalls(evalCase, response);

  const judgeResult = await judge({
    userMessage: evalCase.input,
    response: response.text,
    criteria: evalCase.criteria,
    toolCalls: evalCase.includeToolCalls ? response.toolCalls : undefined,
  });

  expect(judgeResult.pass, `Judge failed: ${judgeResult.reasoning}`).toBe(true);
}
