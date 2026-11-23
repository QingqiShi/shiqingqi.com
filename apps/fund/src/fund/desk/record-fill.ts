import { runTransaction } from "@tuja/server-db/run-transaction";
import { and, eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { ReportLanguage } from "../agents/prompts.ts";
import { fills, journalEntries, orders, theses } from "../fund-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { addDays } from "../ledger/add-days.ts";
import { derivePortfolio } from "../ledger/derive-portfolio.ts";
import { lastOnOrBefore } from "../ledger/last-on-or-before.ts";
import { getFxSeries } from "../market/get-fx-series.ts";
import { getInstruments } from "../market/get-instruments.ts";
import { journalText } from "../meeting/journal-text.ts";
import { sayIn } from "../meeting/memos.ts";
import { estimateFeesGbp } from "../orders/estimate-fees-gbp.ts";
import { formatPrice } from "../orders/format-price.ts";
import { DeskError } from "./desk-error.ts";

const PRICE_TOLERANCE = 1e-6;

export interface RecordFillInput {
  orderId: string;
  quantity: number;
  /** Per share, in major units. */
  price: number;
  filledOn: string;
  feesGbp?: number;
  language?: ReportLanguage;
  now?: Date;
}

/**
 * Records that an open order traded. A quantity below the order's is a
 * partial fill, and the rest of the order ends with it. When a sale takes
 * the position to zero, its thesis is closed.
 */
export async function recordFill(
  db: FundDb,
  {
    orderId,
    quantity,
    price,
    filledOn,
    feesGbp,
    language = "zh",
    now = new Date(),
  }: RecordFillInput,
): Promise<{ fillId: string }> {
  const say = sayIn(language);
  return runTransaction(db, async (tx) => {
    const order = (
      await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    ).at(0);
    if (!order) throw new DeskError(404, "There is no such order.");
    if (order.status !== "open") {
      throw new DeskError(409, `The order is ${order.status}, not open.`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new DeskError(
        400,
        "The quantity must be a whole number of at least 1.",
      );
    }
    if (quantity > order.quantity) {
      throw new DeskError(
        400,
        `The order is for ${String(order.quantity)} shares; a fill cannot be larger.`,
      );
    }
    if (filledOn < order.placedFor || filledOn > order.validUntil) {
      throw new DeskError(
        400,
        `The order lives from ${order.placedFor} to ${order.validUntil}; ${filledOn} is outside it.`,
      );
    }
    if (order.checkedThrough !== null && filledOn <= order.checkedThrough) {
      throw new DeskError(
        409,
        `You said the order did not fill through ${order.checkedThrough}.`,
      );
    }
    const instrument = (await getInstruments(tx)).find(
      (i) => i.symbol === order.symbol,
    );
    if (!instrument)
      throw new DeskError(404, `There is no instrument ${order.symbol}.`);
    if (!Number.isFinite(price) || price <= 0) {
      throw new DeskError(400, "The price must be above zero.");
    }
    const worse =
      order.side === "buy"
        ? price > order.limitPrice * (1 + PRICE_TOLERANCE)
        : price < order.limitPrice * (1 - PRICE_TOLERANCE);
    if (worse) {
      throw new DeskError(
        400,
        `A limit order to ${order.side} at ${formatPrice(order.limitPrice, instrument)} cannot fill at ${formatPrice(price, instrument)}.`,
      );
    }

    const allFills = await tx.select().from(fills);
    if (order.side === "sell") {
      const position = derivePortfolio({
        fills: allFills,
        cashEntries: [],
        asOf: filledOn,
      }).positions.find((p) => p.symbol === order.symbol);
      const unlocked = position?.unlockedQuantity ?? 0;
      if (quantity > unlocked) {
        throw new DeskError(
          409,
          `On ${filledOn} the fund could sell only ${String(unlocked)} ${order.symbol}: the other shares were still in their ${String(GUARDRAILS.minHoldDays)}-day hold or not owned.`,
        );
      }
    }

    let gbpUsd = 1;
    if (instrument.currency === "USD") {
      const fx = await getFxSeries(tx, {
        before: addDays(filledOn, 1),
        sessions: 10,
      });
      const rate = lastOnOrBefore(fx, filledOn);
      if (!rate)
        throw new DeskError(
          409,
          `There is no GBPUSD rate on or before ${filledOn}.`,
        );
      gbpUsd = rate.gbpUsd;
    }
    const fees =
      feesGbp ??
      estimateFeesGbp({
        instrument,
        side: order.side,
        quantity,
        price,
        gbpUsd,
      });
    if (!Number.isFinite(fees) || fees < 0) {
      throw new DeskError(400, "Fees cannot be negative.");
    }

    const [fill] = await tx
      .insert(fills)
      .values({
        orderId,
        symbol: order.symbol,
        side: order.side,
        quantity,
        price,
        gbpUsd,
        feesGbp: fees,
        filledOn,
      })
      .returning({ id: fills.id });
    const partial = quantity < order.quantity;
    const partialNote = say(
      `Partial fill: ${String(quantity)} of ${String(order.quantity)} shares. The rest of the order ended.`,
      `部分成交：${String(order.quantity)} 股中成交 ${String(quantity)} 股，其余部分已终止。`,
    );
    await tx
      .update(orders)
      .set({
        status: "filled",
        checkedThrough: filledOn,
        resolvedAt: now,
        statusNote: partial ? partialNote : null,
      })
      .where(eq(orders.id, orderId));

    const text = journalText(language);
    await tx.insert(journalEntries).values({
      runId: null,
      date: filledOn,
      symbol: order.symbol,
      kind: "filled",
      orderId,
      summary: text.filled(order, quantity, price, instrument, filledOn),
      rationale: [
        say(
          `Limit ${formatPrice(order.limitPrice, instrument)}, filled at ${formatPrice(price, instrument)}; fees £${fees.toFixed(2)}.`,
          `限价 ${formatPrice(order.limitPrice, instrument)}，成交价 ${formatPrice(price, instrument)}；费用 £${fees.toFixed(2)}。`,
        ),
        partial ? partialNote : "",
        `**${say("Why the order was placed", "下单理由")}**\n\n${order.rationale}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });

    if (order.side === "sell") {
      const left = derivePortfolio({
        fills: [
          ...allFills,
          {
            id: fill.id,
            symbol: order.symbol,
            side: "sell",
            quantity,
            price,
            gbpUsd,
            feesGbp: fees,
            filledOn,
          },
        ],
        cashEntries: [],
        asOf: "9999-12-31",
      }).positions.some((p) => p.symbol === order.symbol);
      if (!left) {
        await tx
          .update(theses)
          .set({ status: "closed" })
          .where(
            and(
              eq(theses.scope, "position"),
              eq(theses.symbol, order.symbol),
              eq(theses.status, "active"),
            ),
          );
      }
    }
    return { fillId: fill.id };
  });
}
