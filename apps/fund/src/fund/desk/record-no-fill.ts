import { runTransaction } from "@tuja/server-db/run-transaction";
import { eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { ReportLanguage } from "../agents/prompts.ts";
import { journalEntries, orders } from "../fund-schema.ts";
import { getInstruments } from "../market/get-instruments.ts";
import { journalText } from "../meeting/journal-text.ts";
import { sayIn } from "../meeting/memos.ts";
import { formatPrice } from "../orders/format-price.ts";
import { statusAfterCheck } from "../orders/status-after-check.ts";
import type { Order } from "../types.ts";
import { closeOrphanThesis } from "./close-orphan-thesis.ts";
import { DeskError } from "./desk-error.ts";

/**
 * Records that an open order did not fill in any session through `through`.
 * Once checked through its last day it expires. The journal entry repeats
 * the plan for an unfilled order, since the PM acts on that plan next. A
 * first buy that expires with nothing to do next closes its thesis.
 */
export async function recordNoFill(
  db: FundDb,
  {
    orderId,
    through,
    language = "zh",
    now = new Date(),
  }: {
    orderId: string;
    through: string;
    language?: ReportLanguage;
    now?: Date;
  },
): Promise<{ status: Order["status"] }> {
  const say = sayIn(language);
  return runTransaction(db, async (tx) => {
    const order = (
      await tx.select().from(orders).where(eq(orders.id, orderId)).for("update")
    ).at(0);
    if (!order) throw new DeskError(404, "There is no such order.");
    if (order.status !== "open") {
      throw new DeskError(409, `The order is ${order.status}, not open.`);
    }
    if (through < order.placedFor) {
      throw new DeskError(
        400,
        `The order starts on ${order.placedFor}; ${through} is before it.`,
      );
    }
    const checked = through > order.validUntil ? order.validUntil : through;
    if (order.checkedThrough !== null && checked <= order.checkedThrough) {
      return { status: order.status };
    }
    const status = statusAfterCheck(order, checked);
    const expired = status === "expired";
    await tx
      .update(orders)
      .set({
        checkedThrough: checked,
        status,
        ...(expired
          ? {
              resolvedAt: now,
              statusNote: say(
                `Expired: no fill through ${checked}.`,
                `到期：截至 ${checked} 未成交。`,
              ),
            }
          : {}),
      })
      .where(eq(orders.id, orderId));
    if (expired && order.onExpiry === "cancel" && order.thesisId !== null) {
      await closeOrphanThesis(tx, {
        thesisId: order.thesisId,
        symbol: order.symbol,
      });
    }

    const instrument = (await getInstruments(tx)).find(
      (i) => i.symbol === order.symbol,
    );
    if (!instrument)
      throw new DeskError(404, `There is no instrument ${order.symbol}.`);
    const text = journalText(language);
    const onExpiry = [
      `onExpiry: ${order.onExpiry}`,
      order.repriceLimit !== null
        ? `${say("worst limit", "最差限价")} ${formatPrice(order.repriceLimit, instrument)}`
        : "",
    ]
      .filter(Boolean)
      .join(", ");
    await tx.insert(journalEntries).values({
      runId: null,
      date: checked,
      symbol: order.symbol,
      kind: expired ? "expired" : "not_filled",
      orderId,
      summary: expired
        ? text.expired(order, instrument)
        : text.notFilled(order, instrument, checked),
      rationale: `**${text.unfilledPlan}** (${onExpiry})\n\n${order.unfilledPlan}`,
    });
    return { status };
  });
}
