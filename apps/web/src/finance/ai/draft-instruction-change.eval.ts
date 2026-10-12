import { wrapLanguageModel } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { draftInstructionChange } from "./draft-instruction-change.ts";
import { getFinanceModel } from "./get-finance-model.ts";

/** Claude Sonnet 5.5, US dollars per million tokens. */
const PRICE = { input: 2, output: 10 };

const INSTRUCTIONS = `Payments to J SMITH are our rent.
Alex also has an HSBC account that is not in this app; money to or from it is a transfer.`;

describe("Teach the AI (real model)", () => {
  it("drafts one new line that names the merchant for a commute the AI labelled as travel", async () => {
    const base = getFinanceModel();
    if (!base || typeof base === "string") {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const usage = { input: 0, output: 0 };
    let answer = "";
    const model = wrapLanguageModel({
      model: base,
      middleware: {
        wrapGenerate: async ({ doGenerate }) => {
          const result = await doGenerate();
          usage.input += result.usage.inputTokens.total ?? 0;
          usage.output += result.usage.outputTokens.total ?? 0;
          for (const part of result.content) {
            if (part.type === "text") answer += part.text;
          }
          return result;
        },
      },
    });

    const change = await draftInstructionChange(model, {
      instructions: INSTRUCTIONS,
      aiReason: "TfL fares are travel",
      row: {
        date: "2026-10-09",
        amountMinor: -280,
        currency: "GBP",
        account: "Current",
        merchant: "TFL TRAVEL CH",
        description: "TFL.GOV.UK/CP",
      },
      ai: {
        kind: "expense",
        category: "Transport > Travel",
        payee: "TfL",
        tags: [],
        member: "Alex",
        accounts: ["Current"],
      },
      member: {
        kind: "expense",
        category: "Transport > Commute",
        payee: "TfL",
        tags: ["Commute"],
        member: "Alex",
        accounts: ["Current"],
      },
    });

    const cost =
      (usage.input * PRICE.input + usage.output * PRICE.output) / 1_000_000;
    const drafted = z
      .object({ replaces: z.string().nullable(), line: z.string() })
      .parse(JSON.parse(answer));
    const report = `${answer}\ntokens: input ${String(usage.input)}, output ${String(usage.output)}; cost $${cost.toFixed(4)}`;
    console.log(report);

    expect(change.replaces, report).toBeNull();
    expect(drafted.line, report).not.toContain("\n");
    expect(change.line.length, report).toBeLessThan(200);
    expect(change.line, report).toMatch(/tfl/i);
    expect(change.line, report).toMatch(/commute/i);
    expect(change.line, report).not.toMatch(/rent|HSBC/i);
  });
});
