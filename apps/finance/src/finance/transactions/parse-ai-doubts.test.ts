import { describe, expect, it } from "vitest";
import { parseAiDoubts } from "./parse-ai-doubts.ts";

describe("parseAiDoubts", () => {
  it("reads each doubt with its answer and the runner-up", () => {
    expect(
      parseAiDoubts(
        "Unsure of the kind: expense 59%, transfer 41%; Unsure of the category: 生活 > 下馆子 55%, 生活 > 外卖 33%",
      ),
    ).toEqual([
      {
        subject: "kind",
        options: [
          { label: "expense", percent: 59 },
          { label: "transfer", percent: 41 },
        ],
      },
      {
        subject: "category",
        options: [
          { label: "生活 > 下馆子", percent: 55 },
          { label: "生活 > 外卖", percent: 33 },
        ],
      },
    ]);
  });

  it("reads a doubt about the other side of a transfer", () => {
    expect(
      parseAiDoubts(
        "Unsure of the other side: Round-up 55%, Chase Current 38%",
      ),
    ).toEqual([
      {
        subject: "other side",
        options: [
          { label: "Round-up", percent: 55 },
          { label: "Chase Current", percent: 38 },
        ],
      },
    ]);
  });

  it("leaves other text alone", () => {
    expect(parseAiDoubts("PayPal hides the seller. Check the category.")).toBe(
      null,
    );
    expect(parseAiDoubts("Unsure of the kind: expense 59%, trans")).toBe(null);
  });
});
