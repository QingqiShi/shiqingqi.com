import { format } from "node:util";
import { APIError } from "@typesafe-ai/sdk";
import { APICallError } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, expect, it, vi } from "vitest";
import { draftInstructionChange } from "./draft-instruction-change.ts";
import { logModelFailure } from "./log-model-failure.ts";
import { MOCK_USAGE } from "./testing/mock-usage.ts";
import type { NamedLabels } from "./types.ts";

const marker = "Tesco Extra Leeds 7f3a";

const labels: NamedLabels = {
  kind: "expense",
  category: "Food > Groceries",
  payee: marker,
  tags: [],
  member: null,
  accounts: ["Current account"],
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function draftWith(doGenerate: MockLanguageModelV3["doGenerate"]) {
  return draftInstructionChange(new MockLanguageModelV3({ doGenerate }), {
    instructions: `${marker} is groceries`,
    row: {
      date: "2026-11-02",
      amountMinor: -4210,
      currency: "GBP",
      account: "Current account",
      merchant: marker,
      description: "",
    },
    aiReason: null,
    ai: labels,
    member: labels,
  }).then(
    () => expect.unreachable("the draft should fail"),
    (error: unknown) => error,
  );
}

function logged(error: unknown) {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  logModelFailure("Finance teach failed", error);
  return log.mock.calls.map((args: unknown[]) => format(...args)).join("\n");
}

it("logs an answer that does not parse without the answer", async () => {
  const error = await draftWith(() =>
    Promise.resolve({
      content: [{ type: "text", text: JSON.stringify({ line: [marker] }) }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: MOCK_USAGE,
      warnings: [],
    }),
  );

  expect(format(error)).toContain(marker);
  const line = logged(error);
  expect(line).not.toContain(marker);
  expect(line).toContain("AI_NoObjectGeneratedError");
  expect(line).toContain("AI_TypeValidationError");
});

it("logs a request that failed after retries without its prompt or the response", async () => {
  vi.useFakeTimers();
  const drafted = draftWith(({ prompt }) =>
    Promise.reject(
      new APICallError({
        message: `Overloaded: ${marker}`,
        url: "https://models.example/v1/messages",
        requestBodyValues: { prompt },
        statusCode: 529,
        responseBody: JSON.stringify({ echo: marker }),
        isRetryable: true,
      }),
    ),
  );
  await vi.runAllTimersAsync();
  const error = await drafted;

  expect(format(error)).toContain(marker);
  const line = logged(error);
  expect(line).not.toContain(marker);
  expect(line).toContain("AI_RetryError");
  expect(line).toContain("AI_APICallError");
  expect(line).toContain("529");
});

it("logs a TypeSafe error without its response body", () => {
  const error = APIError.fromResponse(
    422,
    { detail: `Invalid state: ${marker}` },
    new Headers(),
  );

  expect(format(error)).toContain(marker);
  const line = logged(error);
  expect(line).not.toContain(marker);
  expect(line).toContain("UnprocessableEntityError");
  expect(line).toContain("422");
});
