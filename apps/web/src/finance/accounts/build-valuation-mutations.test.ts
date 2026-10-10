import { describe, expect, it } from "vitest";
import { buildValuationMutations } from "./build-valuation-mutations.ts";

const fields = [
  {
    accountId: "isa",
    kind: "investment" as const,
    currency: "GBP",
    current: 1_830_000,
  },
  {
    accountId: "house",
    kind: "property" as const,
    currency: "GBP",
    current: 45_000_000,
  },
  {
    accountId: "mortgage",
    kind: "loan" as const,
    currency: "GBP",
    current: -28_000_000,
  },
  {
    accountId: "pension",
    kind: "investment" as const,
    currency: "USD",
    current: 500_000,
  },
];

function ids() {
  let next = 0;
  return () => `id-${String(++next)}`;
}

describe("buildValuationMutations", () => {
  it("writes one Valuation per changed field and skips the rest", () => {
    const result = buildValuationMutations(
      fields,
      new Map([
        ["isa", "19,250.40"],
        ["house", "450000.00"],
        ["mortgage", "279,500"],
      ]),
      "2026-10-10",
      ids(),
    );
    expect(result.invalid).toEqual([]);
    expect(result.valuations).toEqual([
      {
        id: "id-1",
        accountId: "isa",
        on: "2026-10-10",
        amountMinor: 1_925_040,
      },
      {
        id: "id-2",
        accountId: "mortgage",
        on: "2026-10-10",
        amountMinor: -27_950_000,
      },
    ]);
  });

  it("reads an amount owed as a negative balance and a negative typed debt as credit", () => {
    const result = buildValuationMutations(
      fields,
      new Map([["mortgage", "-12"]]),
      "2026-10-10",
      ids(),
    );
    expect(result.valuations[0]?.amountMinor).toBe(1_200);
  });

  it("skips empty fields and reports text that is not an amount", () => {
    const result = buildValuationMutations(
      fields,
      new Map([
        ["isa", "  "],
        ["house", "about 450k"],
        ["pension", "5000.001"],
      ]),
      "2026-10-10",
      ids(),
    );
    expect(result.valuations).toEqual([]);
    expect(result.invalid).toEqual(["house", "pension"]);
  });

  it("reports each change as the field shows it and flags a large one", () => {
    const result = buildValuationMutations(
      fields,
      new Map([
        ["isa", "19,250.40"],
        ["house", "4,500,000"],
        ["mortgage", "279,500"],
      ]),
      "2026-10-10",
      ids(),
    );
    expect(result.changes.get("isa")).toEqual({
      changeMinor: 95_040,
      share: 95_040 / 1_830_000,
      isLarge: false,
    });
    expect(result.changes.get("mortgage")?.changeMinor).toBe(-50_000);
    expect(result.large).toEqual(["house"]);
  });
});
