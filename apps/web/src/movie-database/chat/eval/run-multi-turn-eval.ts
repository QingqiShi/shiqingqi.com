import { expect } from "vitest";
import { assertToolCalls } from "./assert-tool-calls";
import { judgeConversation } from "./judge";
import { sendConversation } from "./send-conversation";
import type { MultiTurnEvalCase } from "./types";

export async function runMultiTurnEval(evalCase: MultiTurnEvalCase) {
  const turnResults = await sendConversation(evalCase.turns, evalCase.locale);
  const judgeIndex = evalCase.judgeTurnIndex ?? turnResults.length - 1;
  const targetResult = turnResults[judgeIndex];

  assertToolCalls(evalCase, {
    toolCalls: turnResults.flatMap((r) => r.toolCalls),
    text: targetResult.text,
  });

  const transcript = evalCase.turns
    .map((turn, i) => {
      let entry = `User: ${turn.content}`;
      if (i < turnResults.length) {
        entry += `\nAssistant: ${turnResults[i].text}`;
      }
      return entry;
    })
    .join("\n\n");

  const allToolCalls = evalCase.includeToolCalls
    ? turnResults.flatMap((r) => r.toolCalls)
    : undefined;

  const judgeResult = await judgeConversation({
    transcript,
    criteria: evalCase.criteria,
    toolCalls: allToolCalls,
  });

  expect(judgeResult.pass, `Judge failed: ${judgeResult.reasoning}`).toBe(true);
}
