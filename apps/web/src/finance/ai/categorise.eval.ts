import { describe, expect, it } from "vitest";
import { getAnthropicModel } from "#src/anthropic/get-anthropic-model.ts";
import { throttle } from "#src/eval/throttle.ts";
import {
  buildFixtureMemory,
  FIXTURE_ACCOUNT_ID,
} from "./eval/build-fixture-memory.ts";
import { categoriseFixture } from "./eval/categorise-fixture.ts";
import {
  MODEL_BATCH_SIZE,
  suggestLabelsWithModel,
} from "./suggest-labels-with-model.ts";

const CATEGORY_THRESHOLD = 0.85;
const PAYEE_THRESHOLD = 0.9;

function comparable(name: string) {
  return name.toLowerCase().replaceAll(/[^\p{L}\p{N}]/gu, "");
}

function isSamePayee(answer: string, accepted: readonly string[]) {
  const given = comparable(answer);
  if (given === "") return false;
  return accepted.some((name) => {
    const wanted = comparable(name);
    return given === wanted || given.includes(wanted) || wanted.includes(given);
  });
}

describe("Finance categorisation (model step)", () => {
  it(`labels ≥ ${String(CATEGORY_THRESHOLD * 100)}% of the synthetic bank strings with an accepted category`, async () => {
    const { memory, categoryId } = buildFixtureMemory();
    const payeeNames = new Map(
      memory.payees.map((payee) => [payee.id, payee.name]),
    );
    const inputs = categoriseFixture.cases.map((testCase, index) => ({
      key: String(index),
      text: testCase.text,
      amountMinor: testCase.amountMinor,
      date: "2026-10-01",
      accountId: FIXTURE_ACCOUNT_ID,
    }));

    const results = new Map<string, { categoryId: string; payee: string }>();
    for (let start = 0; start < inputs.length; start += MODEL_BATCH_SIZE) {
      await throttle.waitIfNeeded();
      const batch = await suggestLabelsWithModel(
        getAnthropicModel(),
        memory,
        inputs.slice(start, start + MODEL_BATCH_SIZE),
      );
      for (const [key, suggestion] of batch) {
        results.set(key, {
          categoryId: suggestion.categoryId,
          payee:
            suggestion.newPayeeName ??
            (suggestion.payeeId
              ? (payeeNames.get(suggestion.payeeId) ?? "")
              : ""),
        });
      }
    }

    const misses: string[] = [];
    let categoryHits = 0;
    let payeeHits = 0;
    for (const [index, testCase] of categoriseFixture.cases.entries()) {
      const result = results.get(String(index));
      const categoryOk =
        result !== undefined &&
        testCase.categories
          .map((key) => categoryId(key))
          .includes(result.categoryId);
      const payeeOk =
        result !== undefined && isSamePayee(result.payee, testCase.payees);
      if (categoryOk) categoryHits++;
      if (payeeOk) payeeHits++;
      if (!categoryOk || !payeeOk) {
        misses.push(
          `${testCase.text}: payee "${result?.payee ?? "-"}"${categoryOk ? "" : ", wrong category"}`,
        );
      }
    }
    const total = categoriseFixture.cases.length;
    const report = `category ${String(categoryHits)}/${String(total)}, payee ${String(payeeHits)}/${String(total)}\n${misses.join("\n")}`;
    console.log(report);

    expect(categoryHits / total, report).toBeGreaterThanOrEqual(
      CATEGORY_THRESHOLD,
    );
    expect(payeeHits / total, report).toBeGreaterThanOrEqual(PAYEE_THRESHOLD);
  }, 300_000);
});
