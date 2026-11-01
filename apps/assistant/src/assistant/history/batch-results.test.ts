import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";
import { describe, expect, it } from "vitest";
import { readBatchOutput } from "./read-batch-output.ts";
import { answer, TEST_USAGE } from "./testing/create-fake-batch-api.ts";
import { toBatchItem } from "./to-batch-item.ts";

const OUTPUT = {
  category: "Bills",
  asksUserToAct: "yes",
  personal: "no",
  marketing: "no",
  worthKnowing: "yes",
  securityAlert: "no",
  oneTimeCode: "no",
  dueDate: "2026-11-20",
  summary: "Energy Co asks you to pay £42 by 20 November.",
  event: null,
};

function line(json: string) {
  return toBatchItem(JSON.parse(json) as MessageBatchIndividualResponse);
}

describe("toBatchItem", () => {
  it("reads the text and the token usage of a succeeded line, and skips the thinking", () => {
    const item = line(
      JSON.stringify({
        custom_id: "8a6e0804-2bd0-4672-b79d-d97027f8e071",
        result: {
          type: "succeeded",
          message: {
            id: "msg_1",
            type: "message",
            role: "assistant",
            model: "claude-haiku-5-5",
            content: [
              { type: "thinking", thinking: "", signature: "sig" },
              { type: "text", text: JSON.stringify(OUTPUT) },
            ],
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: {
              input_tokens: 1500,
              output_tokens: 300,
              cache_creation_input_tokens: null,
              cache_read_input_tokens: 1200,
            },
          },
        },
      }),
    );

    expect(item).toEqual({
      customId: "8a6e0804-2bd0-4672-b79d-d97027f8e071",
      outcome: {
        type: "succeeded",
        text: JSON.stringify(OUTPUT),
        stopReason: "end_turn",
        usage: { input: 1500, output: 300, cacheRead: 1200, cacheWrite: 0 },
      },
    });
  });

  it("turns an errored or expired line into a failure", () => {
    expect(
      line(
        '{"custom_id":"b","result":{"type":"errored","error":{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"},"request_id":null}}}',
      ).outcome,
    ).toEqual({ type: "failed", reason: "errored:overloaded_error" });
    expect(
      line('{"custom_id":"c","result":{"type":"expired"}}').outcome,
    ).toEqual({ type: "failed", reason: "expired" });
  });
});

describe("readBatchOutput", () => {
  it("reads a whole answer with the categories the request allowed", () => {
    expect(readBatchOutput(answer(OUTPUT), ["Bills"])).toEqual({
      ok: true,
      output: OUTPUT,
    });
  });

  it("fails an answer that names a category the request did not allow", () => {
    expect(readBatchOutput(answer(OUTPUT), ["Travel"])).toEqual({
      ok: false,
      reason: "invalid-output",
    });
  });

  it("fails an answer that stopped early or is not JSON", () => {
    expect(
      readBatchOutput(
        {
          type: "succeeded",
          text: JSON.stringify(OUTPUT),
          stopReason: "max_tokens",
          usage: TEST_USAGE,
        },
        ["Bills"],
      ),
    ).toEqual({ ok: false, reason: "stopped:max_tokens" });
    expect(
      readBatchOutput(
        {
          type: "succeeded",
          text: '{"category":',
          stopReason: "end_turn",
          usage: TEST_USAGE,
        },
        ["Bills"],
      ),
    ).toEqual({ ok: false, reason: "invalid-json" });
  });
});
