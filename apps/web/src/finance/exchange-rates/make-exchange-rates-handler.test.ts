import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FinanceSession } from "../auth/types.ts";
import { accounts, exchangeRates } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import {
  REPLICA_ROW_SHAPE,
  ROW_SHAPE_HEADER,
} from "../sync/replica-row-shape.ts";
import { exchangeRateCursor } from "./exchange-rate-cursor.ts";
import {
  exchangeRatesResponseSchema,
  type ExchangeRateRow,
} from "./exchange-rate-row-schema.ts";
import { makeExchangeRatesHandler } from "./make-exchange-rates-handler.ts";

const URL_BASE = "https://qingqi.dev/api/finance/exchange-rates";

let db: TestDb;
let home: SeededHousehold;
let session: FinanceSession | null;

function rate(
  base: string,
  quote: string,
  on: string,
  value: number,
  source: ExchangeRateRow["source"] = "ecb",
): ExchangeRateRow {
  return { base, quote, on, rate: value, source };
}

const usd = rate("USD", "GBP", "2026-10-20", 0.75);
const usdReverse = rate("GBP", "USD", "2026-10-21", 1.3, "household");
const eur = rate("EUR", "GBP", "2026-10-20", 0.85);

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  const other = await seedTestHousehold(db, "other");
  await setCurrency(home.savingsId, "USD");
  await setCurrency(other.savingsId, "JPY");
  await db
    .insert(exchangeRates)
    .values([
      usd,
      usdReverse,
      eur,
      rate("JPY", "GBP", "2026-10-20", 0.005),
      rate("USD", "EUR", "2026-10-20", 0.9),
    ]);
  session = {
    sessionId: randomUUID(),
    userId: randomUUID(),
    householdId: home.householdId,
    memberId: home.memberId,
    role: "member",
  };
});

afterEach(async () => {
  await db.close();
});

async function setCurrency(accountId: string, currency: string) {
  await db.update(accounts).set({ currency }).where(eq(accounts.id, accountId));
}

function handlerOf(rowShape?: number) {
  return makeExchangeRatesHandler({
    rowShape,
    isConfigured: () => true,
    getDb: () => db,
    getSession: () => Promise.resolve(session),
  });
}

function ratesRequest(query = "", rowShape: number | null = REPLICA_ROW_SHAPE) {
  return new Request(`${URL_BASE}${query}`, {
    headers: rowShape === null ? {} : { [ROW_SHAPE_HEADER]: String(rowShape) },
  });
}

async function get(since?: string) {
  const handler = handlerOf();
  const query = since === undefined ? "" : `?since=${since}`;
  const response = await handler(ratesRequest(query));
  expect(response.status).toBe(200);
  return exchangeRatesResponseSchema.parse(await response.json());
}

describe("makeExchangeRatesHandler", () => {
  it("refuses a request without a session", async () => {
    session = null;
    const handler = handlerOf();

    const response = await handler(ratesRequest());

    expect(response.status).toBe(401);
  });

  it("sends every rate of the Household's pairs in both orientations, and no other, the first time", async () => {
    const first = await get();

    expect(first.replace).toBe(true);
    expect(first.rates).toEqual(expect.arrayContaining([usd, usdReverse]));
    expect(first.rates).toHaveLength(2);
    expect(exchangeRateCursor.parse(first.cursor)).not.toBeNull();
  });

  it("sends only the rates that arrived since the cursor", async () => {
    const first = await get();

    const unchanged = await get(first.cursor);
    expect(unchanged).toEqual({
      cursor: first.cursor,
      replace: false,
      rates: [],
    });

    const newer = rate("USD", "GBP", "2026-10-22", 0.76);
    await db
      .insert(exchangeRates)
      .values([newer, rate("JPY", "GBP", "2026-10-22", 0.006)]);
    const delta = await get(first.cursor);
    expect(delta.replace).toBe(false);
    expect(delta.rates).toEqual([newer]);
    expect(delta.cursor).not.toBe(first.cursor);

    expect(await get(delta.cursor)).toEqual({
      cursor: delta.cursor,
      replace: false,
      rates: [],
    });
  });

  it("sends every rate again when the Household starts to use a new currency", async () => {
    const first = await get();
    await setCurrency(home.cardId, "EUR");

    const after = await get(first.cursor);

    expect(after.replace).toBe(true);
    expect(after.rates).toEqual(expect.arrayContaining([usd, usdReverse, eur]));
    expect(after.rates).toHaveLength(3);
  });

  it("sends every rate again for a cursor that is not one or is ahead of the table", async () => {
    const first = await get();
    const cursor = exchangeRateCursor.parse(first.cursor);
    if (!cursor) throw new Error("No cursor");
    const ahead = exchangeRateCursor.format({ ...cursor, seq: cursor.seq + 1 });

    for (const since of ["junk", "", ahead]) {
      const response = await get(since);
      expect(response.replace, since).toBe(true);
      expect(response.rates, since).toHaveLength(2);
    }
  });

  it("answers with no rates for a Household that does not exist", async () => {
    if (!session) throw new Error("No session");
    session = { ...session, householdId: randomUUID() };

    const response = await get();

    expect(response.replace).toBe(true);
    expect(response.rates).toEqual([]);
  });
});

describe("the row shape handshake of the exchange rates route", () => {
  const SERVER_SHAPE = REPLICA_ROW_SHAPE;

  it("says the server row shape on every response it returns, refusals included", async () => {
    const served = await handlerOf()(ratesRequest());
    const mismatched = await handlerOf()(ratesRequest("", SERVER_SHAPE + 1));
    session = null;
    const unauthorised = await handlerOf()(ratesRequest());

    expect(
      [served, mismatched, unauthorised].map((response) => [
        response.status,
        response.headers.get(ROW_SHAPE_HEADER),
      ]),
    ).toEqual([
      [200, String(SERVER_SHAPE)],
      [426, String(SERVER_SHAPE)],
      [401, String(SERVER_SHAPE)],
    ]);
  });

  it("accepts a request without the header while the server row shape is 7, the shape of the clients from before the header", async () => {
    const response = await handlerOf(7)(ratesRequest("", null));

    expect(response.status).toBe(200);
  });

  it("answers 426 and sends no rates to a client without the header once the server row shape is past 7", async () => {
    const response = await handlerOf(8)(ratesRequest("", null));

    expect(response.status).toBe(426);
    expect(await response.json()).toEqual({ error: "row-shape", rowShape: 8 });
  });

  it.each([
    ["older", SERVER_SHAPE - 1],
    ["newer", SERVER_SHAPE + 1],
  ])(
    "answers 426 and sends no rates to a client with an %s row shape",
    async (_, clientShape) => {
      const response = await handlerOf()(ratesRequest("", clientShape));

      expect(response.status).toBe(426);
      expect(await response.json()).toEqual({
        error: "row-shape",
        rowShape: SERVER_SHAPE,
      });
    },
  );

  it("lets an error the handler throws reach Next, without a response of its own", async () => {
    const handler = makeExchangeRatesHandler({
      isConfigured: () => true,
      getDb: () => {
        throw new Error("The database is gone");
      },
      getSession: () => Promise.resolve(session),
    });

    await expect(handler(ratesRequest())).rejects.toThrow(
      "The database is gone",
    );
  });

  it("answers 400 to a malformed row shape", async () => {
    const response = await handlerOf()(
      new Request(URL_BASE, { headers: { [ROW_SHAPE_HEADER]: "seven" } }),
    );

    expect(response.status).toBe(400);
  });
});
