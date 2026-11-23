import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import YahooFinance from "yahoo-finance2";
import { mapLimited } from "../map-limited.ts";
import type { UniverseEntry } from "../universe.ts";
import { withRetries } from "../with-retries.ts";

/**
 * Writes `universe.json` from the FTSE 100 and S&P 100 constituent tables on
 * Wikipedia, and keeps only the stocks that Yahoo Finance quotes as expected.
 * Run it with `pnpm exec tsx src/fund/market/dev/build-universe.ts`.
 */

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const OUTPUT = resolve(import.meta.dirname, "../universe.json");
const USER_AGENT =
  "fund-universe-builder/1.0 (constituent list refresh script)";
const CONCURRENCY = 4;
const FALLBACK_SECTOR = "Financial Services";
const DUPLICATE_SHARE_CLASSES = new Set(["GOOG"]);

type Index = UniverseEntry["index"];
type Result =
  | { dropped: string }
  | { dropped?: undefined; filled: boolean; entry: UniverseEntry };

// `&amp;` is last: decoded first, `&amp;lt;` would become `<`.
const decodeEntities = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

/** Removes tags until none is left: one pass can join two pieces into a new tag. */
function stripTags(html: string): string {
  let text = html;
  for (;;) {
    const next = text
      .replace(/<sup[\s\S]*?<\/sup>/g, "")
      .replace(/<[^>]+>/g, "");
    if (next === text) return text;
    text = next;
  }
}

const cellText = (html: string) =>
  decodeEntities(stripTags(html)).replace(/\s+/g, " ").trim();

async function fetchConstituentRows(url: string): Promise<string[][]> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}`);
  }
  const html = await response.text();
  const start = html.indexOf('id="constituents"');
  if (start < 0) throw new Error(`No constituents table in ${url}`);
  const table = html.slice(start, html.indexOf("</table>", start));
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)]
    .map(([row]) =>
      [...row.matchAll(/<td[\s\S]*?<\/td>/g)].map(([cell]) => cellText(cell)),
    )
    .filter((cells) => cells.length > 0);
}

const toYahooSymbol = (ticker: string, suffix: string) =>
  ticker.replace(/\.$/, "").replace(/\./g, "-") + suffix;

async function validate({
  symbol,
  index,
}: {
  symbol: string;
  index: Index;
}): Promise<Result> {
  try {
    const summary = await withRetries(() =>
      yf.quoteSummary(symbol, { modules: ["price", "assetProfile"] }),
    );
    const chart = await withRetries(() =>
      yf.chart(symbol, {
        period1: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        interval: "1d",
      }),
    );
    const price = summary.price;
    if (!price || chart.quotes.length === 0) return { dropped: "no data" };
    if (price.quoteType !== "EQUITY") {
      return { dropped: `not an equity (${price.quoteType})` };
    }
    const quoted = price.currency;
    if (index === "FTSE100" && quoted !== "GBp") {
      return { dropped: `quoted in ${String(quoted)}` };
    }
    if (index === "SP100" && quoted !== "USD") {
      return { dropped: `quoted in ${String(quoted)}` };
    }
    const name = price.longName || price.shortName;
    if (!name) return { dropped: "no name" };
    const sector = summary.assetProfile?.sector;
    const industry = summary.assetProfile?.industry;
    return {
      filled: !sector,
      entry: {
        symbol,
        name,
        exchange: index === "FTSE100" ? "LSE" : "US",
        currency: index === "FTSE100" ? "GBP" : "USD",
        quoteScale: quoted === "GBp" ? 100 : 1,
        sector: sector || FALLBACK_SECTOR,
        industry: industry || "Unknown",
        index,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { dropped: `request failed: ${message.slice(0, 80)}` };
  }
}

async function main() {
  const [ftseRows, spRows] = await Promise.all([
    fetchConstituentRows("https://en.wikipedia.org/wiki/FTSE_100_Index"),
    fetchConstituentRows("https://en.wikipedia.org/wiki/S%26P_100"),
  ]);

  const candidates: { symbol: string; index: Index }[] = [
    ...ftseRows.map((cells) => ({
      symbol: toYahooSymbol(cells[1], ".L"),
      index: "FTSE100" as const,
    })),
    ...spRows
      .map((cells) => ({
        symbol: toYahooSymbol(cells[0], ""),
        index: "SP100" as const,
      }))
      .filter(({ symbol }) => !DUPLICATE_SHARE_CLASSES.has(symbol)),
  ];

  const results = await mapLimited(candidates, CONCURRENCY, validate);
  const entries: UniverseEntry[] = [];
  const dropped: string[] = [];
  const filledSectors: string[] = [];
  const seen = new Set<string>();
  results.forEach((result, i) => {
    const { symbol } = candidates[i];
    if (result.dropped !== undefined) {
      dropped.push(`${symbol}: ${result.dropped}`);
      return;
    }
    if (seen.has(symbol)) {
      dropped.push(`${symbol}: duplicate`);
      return;
    }
    seen.add(symbol);
    if (result.filled) filledSectors.push(symbol);
    entries.push(result.entry);
  });

  entries.sort(
    (a, b) =>
      a.index.localeCompare(b.index) || a.symbol.localeCompare(b.symbol),
  );
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(entries, null, 2)}\n`);

  for (const index of ["FTSE100", "SP100"]) {
    console.log(
      `${index}: ${String(entries.filter((e) => e.index === index).length)}`,
    );
  }
  console.log(`Dropped (${String(dropped.length)}):\n${dropped.join("\n")}`);
  console.log(
    `Sector filled with "${FALLBACK_SECTOR}": ${filledSectors.join(", ") || "none"}`,
  );
  const sectors: Record<string, number> = {};
  for (const { sector } of entries)
    sectors[sector] = (sectors[sector] ?? 0) + 1;
  console.log(sectors);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
