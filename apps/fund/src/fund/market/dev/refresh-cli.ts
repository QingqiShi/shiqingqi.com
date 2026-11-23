import { readCliOptions } from "@tuja/dev-tools/read-cli-options";
import { openLocalDb } from "#src/db/dev/open-local-db.ts";
import { refreshMarketData } from "../refresh-market-data.ts";
import { yahooMarketProvider } from "../yahoo-market-provider.ts";

/**
 * Refreshes the market data of the local database of `pnpm dev` from Yahoo
 * Finance: `--symbols A,B` for some stocks only, `--force-fundamentals` to
 * fetch fundamentals that are not yet 7 days old.
 */
async function main() {
  const values = readCliOptions({
    symbols: { type: "string" },
    "force-fundamentals": { type: "boolean" },
  });
  const { db, close } = await openLocalDb({
    cli: "fund:refresh",
    maxConnections: 5,
  });
  try {
    const started = performance.now();
    const summary = await refreshMarketData(db, {
      now: new Date(),
      provider: yahooMarketProvider(),
      symbols: values.symbols
        ?.split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean),
      forceFundamentals: values["force-fundamentals"] ?? false,
    });
    const seconds = (performance.now() - started) / 1000;
    console.log(
      `Added ${String(summary.barsAdded)} bars and ${String(summary.dividendsAdded)} dividends; refreshed ${String(summary.fundamentalsRefreshed)} fundamentals in ${seconds.toFixed(1)} s.`,
    );
    for (const { symbol, stage, message } of summary.failures) {
      console.log(`Failed: ${symbol} (${stage}): ${message}`);
    }
    if (summary.failures.length > 0) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
