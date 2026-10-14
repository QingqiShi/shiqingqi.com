import { describe, expect, it } from "vitest";
import { meterInstitutionDomainModel } from "./eval/meter-finance-model.ts";
import { guessInstitutionDomain } from "./guess-institution-domain.ts";

const THRESHOLD = 0.9;

interface DomainCase {
  name: string;
  /** The answers that count as right; null is "not an institution". */
  accepted: readonly (string | null)[];
  accountCurrency?: string;
}

/** The institution names of real accounts, then a few that are easy to get wrong. */
const CASES: readonly DomainCase[] = [
  { name: "Amex", accepted: ["americanexpress.com", "americanexpress.co.uk"] },
  {
    name: "Amex BA",
    accepted: ["americanexpress.com", "americanexpress.co.uk"],
  },
  { name: "Barclay", accepted: ["barclays.co.uk"] },
  { name: "Barclaycard", accepted: ["barclaycard.co.uk"] },
  { name: "Chase", accepted: ["chase.co.uk"] },
  {
    name: "IBKR GIA",
    accepted: ["interactivebrokers.co.uk", "interactivebrokers.com"],
  },
  {
    name: "IBKR ISA",
    accepted: ["interactivebrokers.co.uk", "interactivebrokers.com"],
  },
  { name: "Monument bank", accepted: ["monument.co"] },
  { name: "Natwest", accepted: ["natwest.com"] },
  { name: "Natwest 信用卡", accepted: ["natwest.com"] },
  { name: "Premium Bond", accepted: ["nsandi.com"] },
  { name: "T212 ISA", accepted: ["trading212.com"] },
  { name: "Wise", accepted: ["wise.com"] },
  {
    name: "Spotify 期权",
    accepted: ["spotify.com", null],
    accountCurrency: "USD",
  },
  { name: "SIPP", accepted: [null] },
  { name: "退休金", accepted: [null] },
  { name: "Crypto", accepted: [null] },
  { name: "Lock 17", accepted: [null] },
  { name: "Nationwide", accepted: ["nationwide.co.uk"] },
  { name: "Halifax", accepted: ["halifax.co.uk"] },
  { name: "Chase", accepted: ["chase.com"], accountCurrency: "USD" },
];

describe("Institution domain guess (real model)", () => {
  it("finds the website of each institution name and says none for the rest", async () => {
    const meter = meterInstitutionDomainModel();

    const started = Date.now();
    const outcomes = await Promise.all(
      CASES.map(async (testCase) => {
        try {
          const domain = await guessInstitutionDomain(
            meter.model,
            testCase.name,
            {
              baseCurrency: "GBP",
              accountCurrency: testCase.accountCurrency ?? "GBP",
            },
          );
          return { testCase, domain, ok: testCase.accepted.includes(domain) };
        } catch (error) {
          return { testCase, domain: `error: ${String(error)}`, ok: false };
        }
      }),
    );
    const seconds = (Date.now() - started) / 1000;

    const hits = outcomes.filter((outcome) => outcome.ok).length;
    const cost = meter.cost();
    const report = [
      `right ${String(hits)}/${String(CASES.length)}`,
      `${meter.summary()}, $${(cost / CASES.length).toFixed(4)} a name, in ${seconds.toFixed(0)} s`,
      ...outcomes.map(
        ({ testCase, domain, ok }) =>
          `${ok ? "ok  " : "MISS"} ${testCase.name} (${testCase.accountCurrency ?? "GBP"}): ${String(domain)}`,
      ),
    ].join("\n");
    console.log(report);

    expect(hits / CASES.length, report).toBeGreaterThanOrEqual(THRESHOLD);
  }, 600_000);
});
