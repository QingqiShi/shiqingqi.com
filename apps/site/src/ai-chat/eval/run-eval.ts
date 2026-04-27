import { expect } from "vitest";
import { sendConversation, sendMessage } from "./chat-adapter";
import { judge, judgeConversation } from "./judge";
import type { DeterministicCheck, EvalCase, MultiTurnEvalCase } from "./types";

function runDeterministicCheck(
  text: string,
  check: DeterministicCheck,
): { pass: boolean; label: string } {
  switch (check.type) {
    case "matches":
      return {
        pass: new RegExp(check.value).test(text),
        label: check.label,
      };
    case "not-matches":
      return {
        pass: !new RegExp(check.value).test(text),
        label: check.label,
      };
    case "contains":
      return {
        pass: text.includes(check.value),
        label: check.label,
      };
    case "not-contains":
      return {
        pass: !text.includes(check.value),
        label: check.label,
      };
    case "min-length":
      return {
        pass: text.length >= check.value,
        label: check.label,
      };
  }
}

export async function runSingleTurnEval(evalCase: EvalCase) {
  const response = await sendMessage(evalCase.input, evalCase.locale);

  if (evalCase.requireToolCall) {
    const called = response.toolCalls.some(
      (tc) => tc.toolName === evalCase.requireToolCall,
    );
    expect(
      called,
      `Expected tool "${evalCase.requireToolCall}" to be called`,
    ).toBe(true);
  }

  if (evalCase.forbidToolCall) {
    const called = response.toolCalls.some(
      (tc) => tc.toolName === evalCase.forbidToolCall,
    );
    expect(
      called,
      `Expected tool "${evalCase.forbidToolCall}" to NOT be called`,
    ).toBe(false);
  }

  if (evalCase.deterministic) {
    for (const check of evalCase.deterministic) {
      const result = runDeterministicCheck(response.text, check);
      expect(result.pass, `Deterministic check failed: ${result.label}`).toBe(
        true,
      );
    }
  }

  const judgeResult = await judge({
    userMessage: evalCase.input,
    response: response.text,
    criteria: evalCase.criteria,
    toolCalls: evalCase.includeToolCalls ? response.toolCalls : undefined,
  });

  expect(judgeResult.pass, `Judge failed: ${judgeResult.reasoning}`).toBe(true);
}

export async function runMultiTurnEval(evalCase: MultiTurnEvalCase) {
  const turnResults = await sendConversation(evalCase.turns, evalCase.locale);
  const judgeIndex = evalCase.judgeTurnIndex ?? turnResults.length - 1;
  const targetResult = turnResults[judgeIndex];

  if (evalCase.requireToolCall) {
    const allCalls = turnResults.flatMap((r) => r.toolCalls);
    const called = allCalls.some(
      (tc) => tc.toolName === evalCase.requireToolCall,
    );
    expect(
      called,
      `Expected tool "${evalCase.requireToolCall}" to be called`,
    ).toBe(true);
  }

  if (evalCase.forbidToolCall) {
    const allCalls = turnResults.flatMap((r) => r.toolCalls);
    const called = allCalls.some(
      (tc) => tc.toolName === evalCase.forbidToolCall,
    );
    expect(
      called,
      `Expected tool "${evalCase.forbidToolCall}" to NOT be called`,
    ).toBe(false);
  }

  if (evalCase.deterministic) {
    for (const check of evalCase.deterministic) {
      const result = runDeterministicCheck(targetResult.text, check);
      expect(result.pass, `Deterministic check failed: ${result.label}`).toBe(
        true,
      );
    }
  }

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
