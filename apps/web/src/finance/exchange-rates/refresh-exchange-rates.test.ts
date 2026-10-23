import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  accounts,
  exchangeRates,
  households,
  valuations,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import { insertTestExpense } from "../db/testing/insert-test-expense.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import type { ExchangeRateRow } from "./exchange-rate-row-schema.ts";
import {
  collectHouseholdPairs,
  refreshExchangeRates,
  refreshHouseholdExchangeRates,
} from "./refresh-exchange-rates.ts";
import {
  createFakeFrankfurter,
  type FakeFrankfurter,
} from "./testing/create-fake-frankfurter.ts";

const THURSDAY = new Date("2026-10-22T06:00:00Z");

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;
let frankfurter: FakeFrankfurter;
let now: Date;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
  frankfurter = createFakeFrankfurter();
  frankfurter.rates.set("USD/GBP", 0.75);
  frankfurter.rates.set("EUR/GBP", 0.85);
  frankfurter.rates.set("JPY/GBP", 0.005);
  now = THURSDAY;
});

afterEach(async () => {
  await db.close();
});

function url(base: string, start: string, end = "2026-10-22") {
  return `https://api.frankfurter.dev/v1/${start}..${end}?base=${base}&symbols=GBP`;
}

const dependencies = {
  fetch: (input: string | URL | Request, init?: RequestInit) =>
    frankfurter.fetch(input, init),
  now: () => now,
};

function refresh(householdId = home.householdId) {
  return refreshHouseholdExchangeRates(db, householdId, dependencies);
}

async function setCurrency(accountId: string, currency: string) {
  await db.update(accounts).set({ currency }).where(eq(accounts.id, accountId));
}

async function insertRates(rows: ExchangeRateRow[]) {
  await db.insert(exchangeRates).values(rows);
}

function readRates() {
  return db
    .select({
      base: exchangeRates.base,
      quote: exchangeRates.quote,
      on: exchangeRates.on,
      rate: exchangeRates.rate,
      source: exchangeRates.source,
    })
    .from(exchangeRates)
    .orderBy(asc(exchangeRates.base), asc(exchangeRates.on));
}

function ecb(base: string, on: string, rate: number): ExchangeRateRow {
  return { base, quote: "GBP", on, rate, source: "ecb" };
}

describe("refreshHouseholdExchangeRates", () => {
  it("fills the gap from the day after the latest rate up to today", async () => {
    await setCurrency(home.savingsId, "USD");
    await insertRates([ecb("USD", "2026-10-19", 0.7)]);

    expect(await refresh()).toEqual({ pairs: 1, added: 3, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-20")]);
    expect(await readRates()).toEqual([
      ecb("USD", "2026-10-19", 0.7),
      ecb("USD", "2026-10-20", 0.75),
      ecb("USD", "2026-10-21", 0.75),
      ecb("USD", "2026-10-22", 0.75),
    ]);
  });

  it("starts after the latest rate when that rate is in the reverse orientation", async () => {
    await setCurrency(home.savingsId, "USD");
    await insertRates([
      ecb("USD", "2026-10-12", 0.7),
      { base: "GBP", quote: "USD", on: "2026-10-20", rate: 1.3, source: "ecb" },
    ]);

    expect(await refresh()).toEqual({ pairs: 1, added: 2, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-21")]);
  });

  it("starts a new pair at the first Entry or Valuation of an account in its currency", async () => {
    await setCurrency(home.savingsId, "USD");
    await insertTestExpense(db, home, home.savingsId, "2026-10-12", -500);
    await insertTestExpense(db, home, home.currentId, "2026-09-01", -500);
    await db.insert(valuations).values({
      id: randomUUID(),
      householdId: home.householdId,
      accountId: home.savingsId,
      on: "2026-10-08",
      amountMinor: 10_000,
      version: 1,
    });

    expect(await refresh()).toEqual({ pairs: 1, added: 11, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-08")]);
  });

  it("starts a new pair with no Entry or Valuation today", async () => {
    await setCurrency(home.savingsId, "USD");

    expect(await refresh()).toEqual({ pairs: 1, added: 1, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-22")]);
    expect(await readRates()).toEqual([ecb("USD", "2026-10-22", 0.75)]);
  });

  it("makes no pair for an account in the Base currency or a deleted account", async () => {
    await db
      .update(accounts)
      .set({ currency: "USD", deletedAt: THURSDAY })
      .where(eq(accounts.id, home.savingsId));

    expect(await refresh()).toEqual({ pairs: 0, added: 0, failed: 0 });

    expect(frankfurter.requests).toEqual([]);
  });

  it("fetches nothing when the pair already has today's rate", async () => {
    await setCurrency(home.savingsId, "USD");
    await insertRates([ecb("USD", "2026-10-22", 0.7)]);

    expect(await refresh()).toEqual({ pairs: 1, added: 0, failed: 0 });

    expect(frankfurter.requests).toEqual([]);
  });

  it("keeps every rate already there, also one a Household gave", async () => {
    const monday = new Date("2026-10-19T06:00:00Z");
    now = monday;
    await setCurrency(home.savingsId, "USD");
    const given: ExchangeRateRow = {
      base: "USD",
      quote: "GBP",
      on: "2026-10-16",
      rate: 0.5,
      source: "household",
    };
    await insertRates([given]);

    expect(await refresh()).toEqual({ pairs: 1, added: 1, failed: 0 });

    expect(frankfurter.requests).toEqual([
      url("USD", "2026-10-17", "2026-10-19"),
    ]);
    expect(await readRates()).toEqual([given, ecb("USD", "2026-10-19", 0.75)]);
  });

  it("counts a pair whose download fails, goes on with the others, and tries it again next time", async () => {
    await setCurrency(home.currentId, "EUR");
    await setCurrency(home.savingsId, "USD");
    await setCurrency(home.cardId, "JPY");
    frankfurter.failures.set("EUR/GBP", new Error("network down"));
    frankfurter.failures.set("JPY/GBP", 500);

    expect(await refresh()).toEqual({ pairs: 3, added: 1, failed: 2 });
    expect(frankfurter.requests).toEqual([
      url("EUR", "2026-10-22"),
      url("JPY", "2026-10-22"),
      url("USD", "2026-10-22"),
    ]);

    frankfurter.failures.clear();
    frankfurter.requests.length = 0;
    expect(await refresh()).toEqual({ pairs: 3, added: 2, failed: 0 });
    expect(frankfurter.requests).toEqual([
      url("EUR", "2026-10-22"),
      url("JPY", "2026-10-22"),
    ]);
  });

  it("asks nothing for a currency the ECB does not publish", async () => {
    await setCurrency(home.savingsId, "AED");

    expect(await refresh()).toEqual({ pairs: 1, added: 0, failed: 0 });

    expect(frankfurter.requests).toEqual([]);
  });

  it("goes back no further than the first day the ECB has both currencies, and asks nothing more next time", async () => {
    now = new Date("2000-02-01T06:00:00Z");
    frankfurter.rates.set("CNY/GBP", 0.07);
    await setCurrency(home.savingsId, "CNY");
    await insertTestExpense(db, home, home.savingsId, "1998-06-01", -500);

    expect(await refresh()).toEqual({ pairs: 1, added: 14, failed: 0 });
    expect(frankfurter.requests).toEqual([
      url("CNY", "2000-01-13", "2000-02-01"),
    ]);

    frankfurter.requests.length = 0;
    expect(await refresh()).toEqual({ pairs: 1, added: 0, failed: 0 });
    expect(frankfurter.requests).toEqual([]);
  });

  it("fills the days before the earliest rate back to the first Entry, keeps the rates there, and asks nothing more next time", async () => {
    await setCurrency(home.savingsId, "USD");
    await insertTestExpense(db, home, home.savingsId, "2026-10-12", -500);
    const copied: ExchangeRateRow = {
      base: "USD",
      quote: "GBP",
      on: "2026-10-19",
      rate: 0.5,
      source: "household",
    };
    await insertRates([copied]);

    expect(await refresh()).toEqual({ pairs: 1, added: 8, failed: 0 });

    expect(frankfurter.requests).toEqual([
      url("USD", "2026-10-12", "2026-10-18"),
      url("USD", "2026-10-20"),
    ]);
    const rates = await readRates();
    expect(rates.at(0)).toEqual(ecb("USD", "2026-10-12", 0.75));
    expect(rates).toContainEqual(copied);

    frankfurter.requests.length = 0;
    expect(await refresh()).toEqual({ pairs: 1, added: 0, failed: 0 });
    expect(frankfurter.requests).toEqual([]);
  });

  it("does not take a rate dated after today as the latest", async () => {
    await setCurrency(home.savingsId, "USD");
    const future = ecb("USD", "2026-11-02", 0.9);
    await insertRates([ecb("USD", "2026-10-19", 0.7), future]);

    expect(await refresh()).toEqual({ pairs: 1, added: 3, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-20")]);
    expect(await readRates()).toContainEqual(future);
  });

  it("fetches only the pairs of the one Household", async () => {
    await setCurrency(home.savingsId, "USD");
    await setCurrency(other.savingsId, "EUR");

    expect(await refresh()).toEqual({ pairs: 1, added: 1, failed: 0 });

    expect(frankfurter.requests).toEqual([url("USD", "2026-10-22")]);
  });
});

describe("collectHouseholdPairs", () => {
  it("keeps one orientation of a pair that Households use both ways round, the one its rows have", async () => {
    await db
      .update(households)
      .set({ baseCurrency: "USD" })
      .where(eq(households.id, other.householdId));
    await setCurrency(home.savingsId, "USD");
    await setCurrency(other.savingsId, "GBP");
    frankfurter.rates.set("GBP/USD", 1.3);
    await insertRates([
      { base: "GBP", quote: "USD", on: "2026-10-19", rate: 1.3, source: "ecb" },
      { base: "GBP", quote: "USD", on: "2026-10-20", rate: 1.3, source: "ecb" },
      ecb("USD", "2026-10-16", 0.75),
    ]);

    const pairs = await collectHouseholdPairs(db, [
      home.householdId,
      other.householdId,
    ]);
    expect(pairs).toEqual([{ base: "USD", quote: "GBP", firstDay: null }]);

    expect(await refreshExchangeRates(db, pairs, dependencies)).toEqual({
      pairs: 1,
      added: 2,
      failed: 0,
    });
    expect(frankfurter.requests).toEqual([
      "https://api.frankfurter.dev/v1/2026-10-21..2026-10-22?base=GBP&symbols=USD",
    ]);
  });

  it("fetches a pair that two Households use once, from the earlier first day", async () => {
    const third = await seedTestHousehold(db, "third");
    await setCurrency(third.savingsId, "USD");
    await setCurrency(home.savingsId, "USD");
    await setCurrency(other.savingsId, "USD");
    await insertTestExpense(db, home, home.savingsId, "2026-10-12", -500);
    await insertTestExpense(db, other, other.savingsId, "2026-10-07", -500);

    const pairs = await collectHouseholdPairs(db, [
      third.householdId,
      home.householdId,
      other.householdId,
    ]);
    expect(pairs).toEqual([
      { base: "USD", quote: "GBP", firstDay: "2026-10-07" },
    ]);

    expect(await refreshExchangeRates(db, pairs, dependencies)).toEqual({
      pairs: 1,
      added: 12,
      failed: 0,
    });
    expect(frankfurter.requests).toEqual([url("USD", "2026-10-07")]);
  });
});
