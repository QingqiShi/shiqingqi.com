import { describe, expect, it } from "vitest";
import { z } from "zod";
import { draftInstructionChange } from "./draft-instruction-change.ts";
import { meterFinanceModel } from "./eval/meter-finance-model.ts";

const INSTRUCTIONS = `Payments to J SMITH are our rent.
Alex also has an HSBC account that is not in this app; money to or from it is a transfer.`;

describe("Teach the AI (real model)", () => {
  it("drafts one new line that names the merchant for a commute the AI labelled as travel", async () => {
    let answer = "";
    const meter = meterFinanceModel((result) => {
      for (const part of result.content) {
        if (part.type === "text") answer += part.text;
      }
    });

    const change = await draftInstructionChange(meter.model, {
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

    const drafted = z
      .object({ replaces: z.string().nullable(), line: z.string() })
      .parse(JSON.parse(answer));
    const report = `${answer}\n${meter.summary()}`;
    console.log(report);

    expect(change.replaces, report).toBeNull();
    expect(drafted.line, report).not.toContain("\n");
    expect(change.line.length, report).toBeLessThan(200);
    expect(change.line, report).toMatch(/tfl/i);
    expect(change.line, report).toMatch(/commute/i);
    expect(change.line, report).not.toMatch(/rent|HSBC/i);
  });
});
