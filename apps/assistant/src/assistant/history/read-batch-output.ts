import {
  classifyPrompt,
  type ClassifyOutput,
} from "#src/assistant/classify/classify-prompt.ts";
import type { BatchItemOutcome } from "./types.ts";

export type BatchOutput =
  { ok: true; output: ClassifyOutput } | { ok: false; reason: string };

/**
 * The model's answer in one batch result, read with the output schema the
 * request had. Any answer that is not a whole, valid object is a failure, so
 * the mail goes back into the queue.
 */
export function readBatchOutput(
  outcome: BatchItemOutcome,
  categoryNames: readonly string[],
): BatchOutput {
  if (outcome.type === "failed") return { ok: false, reason: outcome.reason };
  if (outcome.stopReason !== "end_turn") {
    return { ok: false, reason: `stopped:${outcome.stopReason ?? "unknown"}` };
  }
  let json: unknown;
  try {
    json = JSON.parse(outcome.text);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  const parsed = classifyPrompt.outputSchema(categoryNames).safeParse(json);
  return parsed.success
    ? { ok: true, output: parsed.data }
    : { ok: false, reason: "invalid-output" };
}
