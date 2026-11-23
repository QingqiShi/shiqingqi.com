import { readCliOptions } from "@tuja/dev-tools/read-cli-options";
import { runTransaction } from "@tuja/server-db/run-transaction";
import { eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { ReportLanguage } from "../../agents/prompts.ts";
import { DeskError } from "../../desk/desk-error.ts";
import { recordFill } from "../../desk/record-fill.ts";
import { recordNoFill } from "../../desk/record-no-fill.ts";
import {
  cashEntries,
  fills,
  journalEntries,
  orders,
  riskPolicyVersions,
  runSteps,
  runs,
  theses,
  thesisVersions,
} from "../../fund-schema.ts";
import { getBars } from "../../market/get-bars.ts";
import { getInstruments } from "../../market/get-instruments.ts";
import { addWeekdays } from "../../orders/add-weekdays.ts";
import { fillHint } from "../../orders/fill-hint.ts";
import { formatPrice } from "../../orders/format-price.ts";
import { ordersNeedingCheck } from "../../orders/orders-needing-check.ts";
import { sessionFor } from "../session-for.ts";
import {
  openLocalFund,
  readCommonOptions,
  runMeetingToEnd,
} from "./open-local-fund.ts";

/** Deletes the fund's own state; market data stays. */
async function reset(db: FundDb) {
  await runTransaction(db, async (tx) => {
    await tx.delete(journalEntries);
    await tx.delete(fills);
    await tx.delete(orders);
    await tx.delete(thesisVersions);
    await tx.delete(theses);
    await tx.delete(riskPolicyVersions);
    await tx.delete(runSteps);
    await tx.delete(runs);
    await tx.delete(cashEntries);
  });
  console.log("Reset: the fund's tables are empty; market data is kept.");
}

/**
 * Plays the owner before the meeting of `asOf`: an order that the price
 * reached fills at the hinted price on the first such session; any other
 * order is reported as not filled through the session before.
 */
async function playOwner(db: FundDb, asOf: string, language: ReportLanguage) {
  const open = await db.select().from(orders).where(eq(orders.status, "open"));
  const due = ordersNeedingCheck(open, asOf);
  if (due.length === 0) return;
  const instruments = await getInstruments(db);
  const bars = await getBars(
    db,
    [...new Set(due.map(({ order }) => order.symbol))],
    { before: asOf, sessions: 30 },
  );
  for (const { order, through } of due) {
    const instrument = instruments.find((i) => i.symbol === order.symbol);
    const hit = fillHint(order, bars).find(
      (s) =>
        s.reachable &&
        s.price !== null &&
        (order.checkedThrough === null || s.date > order.checkedThrough),
    );
    if (hit && hit.price !== null && instrument) {
      try {
        await recordFill(db, {
          orderId: order.id,
          quantity: order.quantity,
          price: hit.price,
          filledOn: hit.date,
          language,
        });
        console.log(
          `Owner: ${order.side} ${String(order.quantity)} ${order.symbol} filled at ${formatPrice(hit.price, instrument)} on ${hit.date}.`,
        );
        continue;
      } catch (error) {
        if (!(error instanceof DeskError)) throw error;
        console.log(`Owner: could not fill ${order.symbol}: ${error.message}`);
      }
    }
    const { status } = await recordNoFill(db, {
      orderId: order.id,
      through,
      language,
    });
    console.log(
      `Owner: ${order.side} ${order.symbol} at ${instrument ? formatPrice(order.limitPrice, instrument) : String(order.limitPrice)} not filled through ${through} (${status}).`,
    );
  }
}

/**
 * Replays the fund over past sessions: `--from` and `--to` (weekdays,
 * inclusive), a strategy session first when none exists, then for each
 * weekday the owner's reports and the daily meeting. `--reset` empties the
 * fund's tables first. Market data is never refreshed.
 */
async function main() {
  const values = readCliOptions({
    from: { type: "string" },
    to: { type: "string" },
    tier: { type: "string" },
    universe: { type: "string" },
    language: { type: "string" },
    reset: { type: "boolean" },
  });
  if (!values.from || !values.to) throw new Error("Give --from and --to.");
  const options = { ...readCommonOptions(values), refresh: false };
  const fund = await openLocalFund(options);
  try {
    if (values.reset) await reset(fund.db);
    let hasStrategy =
      (
        await fund.db
          .select({ id: riskPolicyVersions.id })
          .from(riskPolicyVersions)
          .limit(1)
      ).length > 0;
    for (
      let asOf = sessionFor(values.from);
      asOf <= values.to;
      asOf = addWeekdays(asOf, 1)
    ) {
      if (!hasStrategy) {
        hasStrategy = await runMeetingToEnd(fund.deps, {
          kind: "strategy",
          asOf,
          tier: options.tier,
        });
        if (!hasStrategy)
          throw new Error("The strategy session did not complete.");
      }
      await playOwner(fund.db, asOf, options.language);
      const completed = await runMeetingToEnd(fund.deps, {
        kind: "daily",
        asOf,
        tier: options.tier,
      });
      if (!completed)
        throw new Error(`The daily meeting of ${asOf} did not complete.`);
    }
  } finally {
    await fund.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
