import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "#src/db/testing/create-test-db.ts";
import vodFundamentals from "./fixtures/vod-fundamentals.json";
import vodPriceHistory from "./fixtures/vod-price-history.json";
import { getBars } from "./get-bars.ts";
import { getDividends } from "./get-dividends.ts";
import { refreshMarketData } from "./refresh-market-data.ts";
import type { MarketProvider, PriceHistory } from "./types.ts";

const QUOTE_CURRENCIES: Record<string, string | undefined> = {
  "^FTSE": "GBP",
  "^GSPC": "USD",
  "GBPUSD=X": "USD",
};

/** Answers with VOD.L as Yahoo gave it at 12:34 UTC, while London was open. */
const recordedProvider: MarketProvider = {
  priceHistory(symbol) {
    if (symbol === "VOD.L") return Promise.resolve(vodPriceHistory);
    const quoteCurrency = QUOTE_CURRENCIES[symbol];
    if (!quoteCurrency) return Promise.reject(new Error(`No ${symbol}`));
    const empty: PriceHistory = {
      ...vodPriceHistory,
      quoteCurrency,
      bars: [],
      dividends: [],
    };
    return Promise.resolve(empty);
  },
  fundamentals: () => Promise.resolve(vodFundamentals),
  fxRate: (from, to) =>
    from === "GBP" && to === "EUR"
      ? Promise.resolve(1.1942)
      : Promise.reject(new Error(`No ${from}/${to}`)),
};

describe("refreshMarketData", () => {
  let db: TestDb;
  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(async () => {
    await db.close();
  });

  it("stores a session only once it has ended, in pounds", async () => {
    const whileOpen = await refreshMarketData(db, {
      now: new Date("2026-11-23T12:34:01Z"),
      provider: recordedProvider,
      symbols: ["VOD.L"],
    });
    expect(whileOpen.failures).toEqual([]);
    const before = "2026-11-24";
    const barsWhileOpen = await getBars(db, ["VOD.L"], { before, sessions: 3 });
    const lastWhileOpen = barsWhileOpen.get("VOD.L")?.at(-1);
    expect(lastWhileOpen?.date).toBe("2026-11-20");
    expect(lastWhileOpen?.close).toBeCloseTo(1.0835, 4);
    const [dividend] = await getDividends(db, ["VOD.L"], {
      from: "2026-11-01",
      before,
    });
    expect(dividend.exDate).toBe("2026-11-19");
    expect(dividend.amount).toBeCloseTo(0.0193, 4);

    const afterClose = await refreshMarketData(db, {
      now: new Date("2026-11-23T16:31:00Z"),
      provider: recordedProvider,
      symbols: ["VOD.L"],
    });
    expect(afterClose.barsAdded).toBe(1);
    const barsAfterClose = await getBars(db, ["VOD.L"], {
      before,
      sessions: 3,
    });
    const lastAfterClose = barsAfterClose.get("VOD.L")?.at(-1);
    expect(lastAfterClose?.date).toBe("2026-11-23");
    expect(lastAfterClose?.close).toBeCloseTo(1.041, 4);
  });
});
