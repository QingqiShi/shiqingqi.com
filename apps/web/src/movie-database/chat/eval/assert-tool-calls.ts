import { expect } from "vitest";
import { runDeterministicCheck } from "./run-deterministic-check";
import type { EvalCase, ToolCallSummary } from "./types";

/**
 * The mechanical half of an eval case — the tool a turn must or must not call,
 * and the deterministic text checks. A multi-turn case passes the tool calls of
 * every turn and the text of the judged turn.
 */
export function assertToolCalls(
  expected: Pick<
    EvalCase,
    "requireToolCall" | "forbidToolCall" | "deterministic"
  >,
  actual: { toolCalls: ReadonlyArray<ToolCallSummary>; text: string },
) {
  const { requireToolCall, forbidToolCall, deterministic } = expected;

  if (requireToolCall) {
    const called = actual.toolCalls.some(
      (tc) => tc.toolName === requireToolCall,
    );
    expect(called, `Expected tool "${requireToolCall}" to be called`).toBe(
      true,
    );
  }

  if (forbidToolCall) {
    const called = actual.toolCalls.some(
      (tc) => tc.toolName === forbidToolCall,
    );
    expect(called, `Expected tool "${forbidToolCall}" to NOT be called`).toBe(
      false,
    );
  }

  for (const check of deterministic ?? []) {
    const result = runDeterministicCheck(actual.text, check);
    expect(result.pass, `Deterministic check failed: ${result.label}`).toBe(
      true,
    );
  }
}
